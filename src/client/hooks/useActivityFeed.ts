import { useEffect, useRef, useState } from 'react'
import type { ActivityService, FeedEvent } from '../services/ActivityService'
import type { ChangeRecord, TaskRecord } from '../types'
import { value } from '../utils/fields'

/**
 * Owns the weekend activity stream. No AMB subscription of its own: any
 * feed-worthy event (comment, work note, state move) also updates the parent
 * change/task record, so the existing window watchers make useWeekendChanges
 * reload — and the fresh `changes`/`tasks` identities re-run this effect. The
 * first load (and window/refresh reloads, where `ready` drops) shows the
 * loading state; identity-only reloads refetch silently in place.
 */
export function useActivityFeed(
    service: ActivityService,
    changes: ChangeRecord[],
    tasks: TaskRecord[],
    ready: boolean,
): { events: FeedEvent[]; loading: boolean; error: string | null } {
    const [events, setEvents] = useState<FeedEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const seqRef = useRef(0)
    const loadedRef = useRef(false)

    useEffect(() => {
        if (!ready) {
            // Upstream is reloading (first load, week nav, manual refresh):
            // match its skeleton phase and treat the next fetch as a first load.
            loadedRef.current = false
            setLoading(true)
            setError(null)
            return
        }
        const seq = ++seqRef.current
        const ids = [...changes, ...tasks].map((r) => value(r.sys_id)).filter(Boolean)
        service
            .listActivity(ids)
            .then((rows) => {
                if (seq !== seqRef.current) return // a newer fetch superseded this one
                setEvents(rows)
                setError(null)
                setLoading(false)
                loadedRef.current = true
            })
            .catch((err) => {
                if (seq !== seqRef.current) return
                // Silent-refresh failures keep the last good feed; only a failed
                // first load surfaces as an error state.
                if (!loadedRef.current) {
                    setError(err instanceof Error ? err.message : 'Failed to load activity')
                    setLoading(false)
                }
            })
    }, [service, changes, tasks, ready])

    return { events, loading, error }
}
