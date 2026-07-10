// ServiceNow AMB (Asynchronous Message Bus) client — a minimal Bayeux/CometD
// implementation over a raw WebSocket to the instance's /amb endpoint.
//
// Ported from ~/Projects/cmdb_explorer/src/client/services/SnowAmb.ts (itself
// derived from the protocol capture in ~/Projects/mlx-audio/servicenow-amb/),
// extended with auto-reconnect + resubscribe, unsubscribe, and a status
// callback. Auth rides entirely on the session cookie sent with the WS
// upgrade — the Bayeux messages themselves carry no tokens. The now-sdk dev
// server proxies /amb with websocket support, so this works on localhost too.

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
    private keepaliveTimer: ReturnType<typeof setTimeout> | null = null
    private keepaliveTimeout = 30000
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    private reconnectAttempts = 0

    private readonly wsUrl: string
    private readonly connectTimeout: number
    private readonly reconnectBaseDelay: number
    private readonly maxReconnectAttempts: number

    onstatus: ((status: AmbStatus) => void) | null = null
    onerror: ((err: unknown) => void) | null = null

    constructor(opts: { connectTimeout?: number; reconnectBaseDelay?: number; maxReconnectAttempts?: number } = {}) {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        this.wsUrl = `${proto}://${window.location.host}/amb`
        this.connectTimeout = opts.connectTimeout ?? 10000
        this.reconnectBaseDelay = opts.reconnectBaseDelay ?? 2000
        this.maxReconnectAttempts = opts.maxReconnectAttempts ?? 10
    }

    // ---- record-watcher channel helpers --------------------------------

    /** ServiceNow URL-safe base64: standard, then ==→-- and =→-. */
    static base64url(str: string): string {
        const b64 = btoa(unescape(encodeURIComponent(str)))
        return b64.replace(/==$/, '--').replace(/=$/, '-')
    }

    /** Record-watcher channel: /rw/<type>/<table>/<base64url(filter)>. */
    static recordChannel(table: string, filter: string, type = 'default'): string {
        return `/rw/${type}/${table}/${SnowAmb.base64url(filter)}`
    }

    // ---- lifecycle ------------------------------------------------------

    async connect(): Promise<void> {
        if (this.destroyed) return
        this.onstatus?.('connecting')
        try {
            await this.openSocket()
            await this.handshake()
            await this.startKeepalive()
            this.connected = true
            this.reconnectAttempts = 0
            this.onstatus?.('live')
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
        if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer)
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
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
            const timer = setTimeout(() => {
                this.closeSocket()
                reject(new Error(`AMB connect timeout (${this.connectTimeout}ms)`))
            }, this.connectTimeout)

            const ws = new WebSocket(this.wsUrl)
            this.ws = ws
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
    }

    private async startKeepalive(): Promise<void> {
        const resp = await this.send({
            channel: '/meta/connect',
            connectionType: 'websocket',
            advice: { timeout: 0 },
            clientId: this.clientId!,
        })
        if (!resp.successful) throw new Error(`AMB connect failed: ${resp.error || 'unknown'}`)
        this.scheduleKeepalive()
    }

    private scheduleKeepalive(): void {
        if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer)
        if (this.destroyed || !this.connected) return
        const delay = Math.max(this.keepaliveTimeout - 5000, 5000)
        this.keepaliveTimer = setTimeout(async () => {
            if (!this.connected || this.destroyed) return
            try {
                const resp = await this.send({
                    channel: '/meta/connect',
                    connectionType: 'websocket',
                    clientId: this.clientId!,
                })
                // '402::Unknown client' + advice.reconnect='handshake' → session
                // recycled server-side; tear down and re-handshake.
                if (!resp.successful && resp.advice?.reconnect === 'handshake') {
                    this.closeSocket()
                    this.handleClose()
                    return
                }
                this.scheduleKeepalive()
            } catch (err) {
                this.onerror?.(err)
                // send() rejection means the socket is gone; onclose handles reconnect.
            }
        }, delay)
    }

    /** (Re)subscribe every locally registered channel the server doesn't know. */
    private async flushSubscriptions(): Promise<void> {
        for (const channel of this.callbacks.keys()) {
            if (!this.active.has(channel)) await this.sendSubscribe(channel)
        }
    }

    private async sendSubscribe(channel: string): Promise<void> {
        try {
            const resp = await this.send({ channel: '/meta/subscribe', subscription: channel, clientId: this.clientId! })
            if (resp.successful) this.active.add(channel)
            else this.onerror?.(new Error(`Subscribe failed for ${channel}: ${resp.error || 'unknown'}`))
        } catch (err) {
            this.onerror?.(err)
        }
    }

    // ---- send / receive -------------------------------------------------

    private send(msg: Partial<BayeuxMessage> & { channel: string }): Promise<BayeuxMessage> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('AMB socket not open'))
                return
            }
            const id = String(++this.msgId)
            ;(msg as BayeuxMessage).id = id
            const timer = setTimeout(() => {
                this.pending.delete(id)
                reject(new Error(`AMB timeout waiting for ${msg.channel} (id ${id})`))
            }, 15000)
            this.pending.set(id, { resolve, reject, timer })
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
            // Data frames dispatch to channel subscribers.
            if (msg.channel && !msg.channel.startsWith('/meta/')) {
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
        if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer)
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
        this.onstatus?.('connecting')
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.closeSocket()
            void this.connect()
        }, delay)
    }
}
