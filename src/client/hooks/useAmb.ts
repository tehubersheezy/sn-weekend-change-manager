import { useEffect, useRef, useState } from 'react'
import { SnowAmb, type AmbStatus } from '../services/SnowAmb'

/**
 * Owns a single AMB connection for the app's lifetime. Returns the client
 * (stable identity) and its live/connecting/offline status for the UI.
 */
export function useAmbClient(): { amb: SnowAmb; status: AmbStatus } {
    const [status, setStatus] = useState<AmbStatus>('connecting')
    const ref = useRef<SnowAmb | null>(null)
    // Verbose Bayeux tracing, on by default while the AMB layer beds in.
    // Silence from the deployed console with: localStorage['wcm.ambDebug'] = '0'
    // On localhost the dev server's /amb proxy can't authenticate the WS
    // upgrade, so now.dev.mjs runs a session-cookie sidecar on :3001.
    if (!ref.current) {
        const local = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        ref.current = new SnowAmb({
            debug: localStorage.getItem('wcm.ambDebug') !== '0',
            wsUrl: local ? `ws://${window.location.hostname}:3001/amb` : undefined,
        })
    }

    useEffect(() => {
        // connect() revives a destroyed client, so the StrictMode dev cycle
        // (mount → destroy → remount) reconnects the same instance and keeps
        // every child's queued subscription.
        const client = ref.current!
        client.onstatus = setStatus
        client.onerror = (err) => console.warn('[AMB]', err)
        void client.connect()
        return () => client.destroy()
    }, [])

    return { amb: ref.current, status }
}

/**
 * Subscribe to a record-watcher channel for the lifetime of the component.
 * Events are debounced (bursts of Bayeux frames collapse into one callback).
 * Pass filter=null to disable the watch. Resubscribes when table/filter change;
 * the callback is kept in a ref so a new render never churns the subscription.
 */
export function useRecordWatch(
    amb: SnowAmb,
    table: string,
    filter: string | null,
    onEvent: () => void,
    debounceMs = 400,
): void {
    const cbRef = useRef(onEvent)
    cbRef.current = onEvent

    useEffect(() => {
        if (!filter) return
        const channel = SnowAmb.recordChannel(table, filter)
        let timer: ReturnType<typeof setTimeout> | null = null
        const handler = () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                timer = null
                cbRef.current()
            }, debounceMs)
        }
        amb.subscribe(channel, handler)
        return () => {
            if (timer) clearTimeout(timer)
            amb.unsubscribe(channel, handler)
        }
    }, [amb, table, filter, debounceMs])
}
