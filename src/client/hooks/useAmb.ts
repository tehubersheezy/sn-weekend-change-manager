import { useEffect, useRef, useState } from 'react'
import { SnowAmb, type AmbStatus } from '../services/SnowAmb'

/**
 * Owns a single AMB connection for the app's lifetime. Returns the client
 * (stable identity) and its live/connecting/offline status for the UI.
 */
export function useAmbClient(): { amb: SnowAmb; status: AmbStatus } {
    const [status, setStatus] = useState<AmbStatus>('connecting')
    const ref = useRef<SnowAmb | null>(null)
    if (!ref.current) ref.current = new SnowAmb()

    useEffect(() => {
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
