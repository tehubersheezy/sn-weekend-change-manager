// ServiceNow AMB (Asynchronous Message Bus) client — a minimal Bayeux/CometD
// implementation over a raw WebSocket to the instance's /amb endpoint.
//
// Ported from ~/Projects/cmdb_explorer/src/client/services/SnowAmb.ts (itself
// derived from the protocol capture in ~/Projects/mlx-audio/servicenow-amb/),
// extended with auto-reconnect + resubscribe, unsubscribe, and a status
// callback. Auth rides entirely on the session cookie sent with the WS
// upgrade — the Bayeux messages themselves carry no tokens. The now-sdk dev
// server proxies /amb with websocket support, so this works on localhost too.
//
// Keepalive follows the capture's Step 4 exactly: after the initial
// /meta/connect (advice timeout:0, answered immediately), exactly one
// long-held /meta/connect stays outstanding at all times — the server holds
// it up to advice.timeout (~30s) before replying, and the reply is the cue to
// issue the next one. The hold is NOT a timeout; leaving gaps with no
// outstanding connect lets the server treat the session as idle.

interface BayeuxMessage {
    id?: string
    channel: string
    clientId?: string
    subscription?: string
    successful?: boolean
    error?: string
    data?: unknown
    advice?: { reconnect?: 'retry' | 'handshake' | 'none'; timeout?: number; interval?: number }
    [k: string]: unknown
}

export type AmbStatus = 'connecting' | 'live' | 'offline'
export type DataCallback = (data: unknown, raw: BayeuxMessage) => void

interface Pending {
    resolve: (msg: BayeuxMessage) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
}

const REPLY_TIMEOUT = 15000
const SUBSCRIBE_RETRIES = 3 // mirrors the server's subscribeCommandsFlow {retries:3, retryDelay min 2000}

export class SnowAmb {
    private ws: WebSocket | null = null
    private clientId: string | null = null
    private msgId = 0
    private pending = new Map<string, Pending>()
    private callbacks = new Map<string, Set<DataCallback>>()
    /** Channels the server currently knows about (cleared on reconnect). */
    private active = new Set<string>()
    private connected = false
    private destroyed = false
    private keepaliveTimeout = 30000
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    private reconnectAttempts = 0

    private readonly wsUrl: string
    private readonly connectTimeout: number
    private readonly reconnectBaseDelay: number
    private readonly maxReconnectAttempts: number
    private readonly debug: boolean

    onstatus: ((status: AmbStatus) => void) | null = null
    onerror: ((err: unknown) => void) | null = null

    constructor(
        opts: {
            connectTimeout?: number
            reconnectBaseDelay?: number
            maxReconnectAttempts?: number
            debug?: boolean
            /** Override the same-origin /amb endpoint (local dev sidecar). */
            wsUrl?: string
        } = {},
    ) {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        this.wsUrl = opts.wsUrl ?? `${proto}://${window.location.host}/amb`
        this.connectTimeout = opts.connectTimeout ?? 10000
        this.reconnectBaseDelay = opts.reconnectBaseDelay ?? 2000
        this.maxReconnectAttempts = opts.maxReconnectAttempts ?? 10
        this.debug = opts.debug ?? false
    }

    private log(...args: unknown[]): void {
        if (this.debug) console.info('[AMB]', ...args)
    }

    // ---- record-watcher channel helpers --------------------------------

    /** ServiceNow URL-safe base64: standard, then ==→-- and =→-. */
    static base64url(str: string): string {
        const b64 = btoa(unescape(encodeURIComponent(str)))
        return b64.replace(/==$/, '--').replace(/=$/, '-')
    }

    /** Inverse of base64url — used to render readable channel names in logs. */
    static base64urlDecode(encoded: string): string {
        const b64 = encoded.replace(/--$/, '==').replace(/-$/, '=')
        return decodeURIComponent(escape(atob(b64)))
    }

    /** Record-watcher channel: /rw/<type>/<table>/<base64url(filter)>. */
    static recordChannel(table: string, filter: string, type = 'default'): string {
        return `/rw/${type}/${table}/${SnowAmb.base64url(filter)}`
    }

    /** Human-readable channel name for logs: decodes /rw/ filter segments. */
    private static describe(channel: string): string {
        const m = channel.match(/^\/rw\/([^/]+)\/([^/]+)\/(.+)$/)
        if (!m) return channel
        try {
            return `/rw/${m[1]}/${m[2]}/[${SnowAmb.base64urlDecode(m[3])}]`
        } catch {
            return channel
        }
    }

    // ---- lifecycle ------------------------------------------------------

    async connect(): Promise<void> {
        // A destroyed client may be revived: React StrictMode dev remounts
        // destroy and immediately re-connect the same instance.
        this.destroyed = false
        this.onstatus?.('connecting')
        try {
            await this.openSocket()
            await this.handshake()
            await this.initialConnect()
            this.connected = true
            this.reconnectAttempts = 0
            this.onstatus?.('live')
            this.holdConnect()
            await this.flushSubscriptions()
        } catch (err) {
            this.onerror?.(err)
            this.scheduleReconnect()
        }
    }

    /**
     * Register a callback for a channel. Safe to call before the connection is
     * up — the subscription is queued and flushed on (re)connect.
     */
    subscribe(channel: string, cb: DataCallback): void {
        if (!this.callbacks.has(channel)) this.callbacks.set(channel, new Set())
        this.callbacks.get(channel)!.add(cb)
        if (this.connected && !this.active.has(channel)) {
            void this.sendSubscribe(channel)
        } else if (!this.connected) {
            this.log(`subscribe queued (offline): ${SnowAmb.describe(channel)}`)
        }
    }

    /** Remove a callback (or all callbacks) for a channel. */
    unsubscribe(channel: string, cb?: DataCallback): void {
        const set = this.callbacks.get(channel)
        if (!set) return
        if (cb) set.delete(cb)
        if (!cb || set.size === 0) {
            this.callbacks.delete(channel)
            if (this.connected && this.active.has(channel)) {
                this.active.delete(channel)
                void this.send({ channel: '/meta/unsubscribe', subscription: channel, clientId: this.clientId! }).catch(
                    () => {
                        /* connection may be mid-drop; resubscribe logic will settle state */
                    },
                )
            }
        }
    }

    destroy(): void {
        this.destroyed = true
        this.connected = false
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
        if (this.ws && this.clientId) {
            void this.send({ channel: '/meta/disconnect', clientId: this.clientId }).catch(() => {
                /* best-effort */
            })
        }
        this.closeSocket()
        this.onstatus?.('offline')
    }

    // ---- websocket ------------------------------------------------------

    private openSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.log(`opening ${this.wsUrl}`)
            const ws = new WebSocket(this.wsUrl)
            this.ws = ws
            const timer = setTimeout(() => {
                // Only tear down if this attempt still owns the socket — a
                // revived client may have opened a newer one meanwhile.
                if (this.ws === ws) this.closeSocket()
                reject(new Error(`AMB connect timeout (${this.connectTimeout}ms)`))
            }, this.connectTimeout)
            ws.onopen = () => {
                clearTimeout(timer)
                resolve()
            }
            ws.onerror = (e) => {
                clearTimeout(timer)
                reject(new Error('AMB WebSocket connection failed'))
                this.onerror?.(e)
            }
            ws.onclose = () => this.handleClose()
            ws.onmessage = (e) => this.handleMessage(e)
        })
    }

    private closeSocket(): void {
        if (this.ws) {
            this.ws.onopen = this.ws.onclose = this.ws.onerror = this.ws.onmessage = null
            if (this.ws.readyState <= WebSocket.OPEN) this.ws.close()
            this.ws = null
        }
    }

    // ---- bayeux ---------------------------------------------------------

    private async handshake(): Promise<void> {
        const resp = await this.send({
            version: '1.0',
            minimumVersion: '1.0',
            channel: '/meta/handshake',
            supportedConnectionTypes: ['websocket', 'long-polling'],
            advice: { timeout: 60000, interval: 0 },
            ext: { supportsSubscribeCommandFlow: true },
        })
        if (!resp.successful) throw new Error(`AMB handshake failed: ${resp.error || 'unknown'}`)
        this.clientId = resp.clientId as string
        if (resp.advice?.timeout) this.keepaliveTimeout = resp.advice.timeout
        this.log(`handshake ok clientId=${this.clientId} server advice`, resp.advice)
    }

    /** First /meta/connect carries advice timeout:0 → the server replies immediately. */
    private async initialConnect(): Promise<void> {
        const resp = await this.send({
            channel: '/meta/connect',
            connectionType: 'websocket',
            advice: { timeout: 0 },
            clientId: this.clientId!,
        })
        if (!resp.successful) throw new Error(`AMB connect failed: ${resp.error || 'unknown'}`)
    }

    /**
     * Keep exactly one long-held /meta/connect outstanding (capture Step 4).
     * The server answers within advice.timeout (~30s); each reply immediately
     * triggers the next hold. Reply timeout = hold window + 10s grace.
     */
    private holdConnect(): void {
        if (this.destroyed || !this.connected) return
        void this.send(
            { channel: '/meta/connect', connectionType: 'websocket', clientId: this.clientId! },
            this.keepaliveTimeout + 10000,
        )
            .then((resp) => {
                if (this.destroyed || !this.connected) return
                if (!resp.successful) {
                    // '402::Unknown client' + advice.reconnect='handshake' →
                    // session recycled server-side; tear down and re-handshake.
                    this.log(`held connect refused (${resp.error || 'unknown'}) — reconnecting`)
                    this.closeSocket()
                    this.handleClose()
                    return
                }
                if (resp.advice?.timeout) this.keepaliveTimeout = resp.advice.timeout
                this.holdConnect()
            })
            .catch((err) => {
                if (this.destroyed || !this.connected) return
                // No reply within hold window + grace: the socket is a zombie.
                this.onerror?.(err)
                this.closeSocket()
                this.handleClose()
            })
    }

    /** (Re)subscribe every locally registered channel the server doesn't know. */
    private async flushSubscriptions(): Promise<void> {
        for (const channel of this.callbacks.keys()) {
            if (!this.active.has(channel)) await this.sendSubscribe(channel)
        }
    }

    private async sendSubscribe(channel: string, attempt = 0): Promise<void> {
        try {
            const resp = await this.send({ channel: '/meta/subscribe', subscription: channel, clientId: this.clientId! })
            if (resp.successful) {
                this.active.add(channel)
            } else {
                // The server answered no — retrying the same request won't help.
                this.onerror?.(new Error(`Subscribe refused for ${SnowAmb.describe(channel)}: ${resp.error || 'unknown'}`))
            }
        } catch (err) {
            // Timeout or socket drop mid-request. Retry with the server's own
            // subscribeCommandsFlow backoff (2s doubling), as long as someone
            // still wants the channel and nothing else re-subscribed it.
            if (!this.destroyed && this.connected && this.callbacks.has(channel) && attempt < SUBSCRIBE_RETRIES) {
                const delay = 2000 * 2 ** attempt
                this.log(`subscribe retry ${attempt + 1}/${SUBSCRIBE_RETRIES} in ${delay}ms: ${SnowAmb.describe(channel)}`)
                setTimeout(() => {
                    if (!this.destroyed && this.connected && this.callbacks.has(channel) && !this.active.has(channel)) {
                        void this.sendSubscribe(channel, attempt + 1)
                    }
                }, delay)
            } else {
                this.onerror?.(err)
            }
        }
    }

    // ---- send / receive -------------------------------------------------

    private send(msg: Partial<BayeuxMessage> & { channel: string }, replyTimeout = REPLY_TIMEOUT): Promise<BayeuxMessage> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('AMB socket not open'))
                return
            }
            const id = String(++this.msgId)
            ;(msg as BayeuxMessage).id = id
            const started = Date.now()
            const label = msg.subscription ? `${msg.channel} ${SnowAmb.describe(msg.subscription)}` : msg.channel
            this.log(`→ id=${id} ${label}`)
            const timer = setTimeout(() => {
                this.pending.delete(id)
                this.log(`✗ id=${id} ${label} no reply after ${replyTimeout}ms`)
                reject(new Error(`AMB timeout waiting for ${msg.channel} (id ${id})`))
            }, replyTimeout)
            this.pending.set(id, {
                resolve: (reply) => {
                    this.log(
                        `← id=${id} ${label} ok=${reply.successful} (${Date.now() - started}ms)` +
                            (reply.error ? ` error=${reply.error}` : ''),
                    )
                    resolve(reply)
                },
                reject,
                timer,
            })
            this.ws.send(JSON.stringify([msg]))
        })
    }

    private handleMessage(event: MessageEvent): void {
        let messages: BayeuxMessage[]
        try {
            const parsed = JSON.parse(String(event.data))
            messages = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
            return
        }
        for (const msg of messages) {
            // Meta responses resolve their matching send() promise.
            if (msg.id && this.pending.has(msg.id)) {
                const p = this.pending.get(msg.id)!
                clearTimeout(p.timer)
                this.pending.delete(msg.id)
                p.resolve(msg)
                continue
            }
            // Server-initiated rehandshake advice (e.g. session recycled while
            // no held connect was pending, or a reply that outlived its timer).
            if (msg.channel === '/meta/connect' && msg.advice?.reconnect === 'handshake') {
                this.log('server advised rehandshake — reconnecting')
                this.closeSocket()
                this.handleClose()
                continue
            }
            if (msg.channel?.startsWith('/meta/')) {
                // A reply we stopped waiting for, or other unsolicited meta
                // traffic — surface it, this is exactly what diagnoses timeouts.
                this.log('← unmatched meta frame', msg)
                continue
            }
            // Data frames dispatch to channel subscribers.
            if (msg.channel) {
                this.log(`← data ${SnowAmb.describe(msg.channel)}`, msg.data)
                const subs = this.callbacks.get(msg.channel)
                if (subs)
                    for (const cb of subs) {
                        try {
                            cb(msg.data, msg)
                        } catch (err) {
                            console.error('[SnowAmb] subscriber error', err)
                        }
                    }
            }
        }
    }

    private handleClose(): void {
        const wasConnected = this.connected
        this.connected = false
        this.active.clear()
        for (const [, p] of this.pending) {
            clearTimeout(p.timer)
            p.reject(new Error('AMB socket closed'))
        }
        this.pending.clear()
        if (!this.destroyed && wasConnected) this.scheduleReconnect()
    }

    private scheduleReconnect(): void {
        if (this.destroyed || this.reconnectTimer) return
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.onstatus?.('offline')
            return
        }
        const delay = Math.min(this.reconnectBaseDelay * 2 ** this.reconnectAttempts, 60000)
        this.reconnectAttempts += 1
        this.log(`reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
        this.onstatus?.('connecting')
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.closeSocket()
            void this.connect()
        }, delay)
    }
}
