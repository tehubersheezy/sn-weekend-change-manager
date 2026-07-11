import { servicenowFrontEndPlugins, watch } from '@servicenow/isomorphic-rollup'
import { createServer } from 'node:http'
import { connect as tlsConnect } from 'node:tls'

const AMB_PROXY_PORT = Number(process.env.AMB_PROXY_PORT ?? 3001)

// The now-sdk dev server proxies /amb with websocket:true, but its auth
// injection (replyOptions.rewriteRequestHeaders) only covers plain HTTP — the
// WS upgrade reaches the instance with no credentials, so AMB never leaves
// "Connecting" on localhost. ServiceNow's /amb authenticates via session
// cookie on the upgrade (Basic headers alone don't cut it for a server-side
// caller), so this sidecar primes a session with one REST call and splices
// the browser's upgrade through to wss://<instance>/amb with those cookies.
// The client targets ws://localhost:3001/amb when running on localhost.
function startAmbProxy({ credential, logger }) {
    const instance = credential.getUrl()
    const host = instance.hostname

    async function primeSession() {
        const authHeaders = await credential.getHeaders()
        const res = await fetch(`${instance.origin}/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id`, {
            headers: { ...authHeaders, Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`session prime failed: HTTP ${res.status}`)
        const cookies = res.headers.getSetCookie().map((c) => c.split(';')[0])
        if (!cookies.length) throw new Error('session prime returned no cookies')
        return cookies.join('; ')
    }

    const server = createServer((req, res) => {
        res.statusCode = 426
        res.end('AMB proxy: WebSocket upgrades only')
    })

    server.on('upgrade', async (req, socket, head) => {
        if (!req.url?.startsWith('/amb')) {
            socket.destroy()
            return
        }
        try {
            // The browser already holds instance session cookies: the dev
            // server's /api proxy passes Set-Cookie back, and cookies are
            // host-scoped (not port-scoped), so they arrive on this upgrade
            // too. That session is the one that ran the record queries — the
            // record watcher must attach to IT, or subscribes get refused
            // with 404::message_deleted. Only prime a fresh session when the
            // browser has none yet (e.g. AMB won the race against /api).
            const browserCookie = req.headers.cookie
            const useBrowser = browserCookie && /JSESSIONID|glide_user_route/.test(browserCookie)
            const cookie = useBrowser ? browserCookie : await primeSession()
            logger.info(`[amb-proxy] upgrade using ${useBrowser ? 'browser session cookies' : 'freshly primed session'}`)
            const upstream = tlsConnect({ host, port: 443, servername: host })
            const drop = () => {
                socket.destroy()
                upstream.destroy()
            }
            upstream.on('error', drop)
            socket.on('error', drop)
            upstream.on('close', () => socket.destroy())
            socket.on('close', () => upstream.destroy())
            upstream.on('secureConnect', () => {
                const h = req.headers
                const lines = [
                    'GET /amb HTTP/1.1',
                    `Host: ${host}`,
                    'Connection: Upgrade',
                    'Upgrade: websocket',
                    `Origin: ${instance.origin}`,
                    `Cookie: ${cookie}`,
                    `Sec-WebSocket-Key: ${h['sec-websocket-key']}`,
                    `Sec-WebSocket-Version: ${h['sec-websocket-version'] ?? '13'}`,
                ]
                if (h['sec-websocket-extensions']) lines.push(`Sec-WebSocket-Extensions: ${h['sec-websocket-extensions']}`)
                if (h['sec-websocket-protocol']) lines.push(`Sec-WebSocket-Protocol: ${h['sec-websocket-protocol']}`)
                upstream.write(lines.join('\r\n') + '\r\n\r\n')
                if (head?.length) upstream.write(head)
                socket.pipe(upstream)
                // Forwarding the browser's own Sec-WebSocket-Key means the
                // instance's 101 (and its Sec-WebSocket-Accept) can be piped
                // back verbatim — from here on we're a dumb byte splice.
                upstream.once('data', (chunk) => {
                    logger.info(`[amb-proxy] upstream: ${chunk.toString('latin1').split('\r\n')[0]}`)
                    socket.write(chunk)
                    upstream.pipe(socket)
                })
            })
        } catch (err) {
            logger.warn(`[amb-proxy] ${err instanceof Error ? err.message : err}`)
            socket.destroy()
        }
    })

    server.on('error', (err) => logger.warn(`[amb-proxy] not started: ${err.message}`))
    server.listen(AMB_PROXY_PORT, () => {
        logger.info(`[amb-proxy] ws://localhost:${AMB_PROXY_PORT}/amb → wss://${host}/amb (session-cookie auth)`)
    })
}

export default async ({ rootDir, config, fs, path, logger, credential }) => {
    if (credential && typeof credential.getUrl === 'function' && typeof credential.getHeaders === 'function') {
        startAmbProxy({ credential, logger })
    } else {
        logger.warn('[amb-proxy] no credential available — AMB will not work on localhost')
    }
    const clientDir = path.join(rootDir, config.clientDir)
    const staticContentDir = path.join(rootDir, config.staticContentDir)
    fs.rmSync(staticContentDir, { recursive: true, force: true })
    const watcher = watch({
        fs,
        input: path.join(clientDir, '**', '*.html'),
        plugins: servicenowFrontEndPlugins({
            dev: true,
            scope: config.scope,
            rootDir: clientDir,
            watchPaths: [staticContentDir],
            credential,
        }),
        output: {
            dir: staticContentDir,
            sourcemap: true,
        },
    })

    return new Promise((resolve, reject) => {
        watcher.on('event', (event) => {
            if (event.error) {
                reject(event.error)
            } else if (event.result) {
                logger.info(`Finished watch build in ${event.duration}ms`)
                event.result.close()
            }
        })
    })
}
