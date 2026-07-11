import { useCallback, useEffect, useState } from 'react'
import type { ChangeRecord, TaskRecord } from '../types'
import { weekendChangeQuery, weekendTaskQuery, type ChangeService } from '../services/ChangeService'
import type { SnowAmb } from '../services/SnowAmb'
import { useRecordWatch } from './useAmb'
import type { WeekendWindow } from '../utils/weekendWindow'

/**
 * Owns the weekend's change + task data: initial/manual loads show the loading
 * state, AMB record-watcher events refetch silently in place. Watches the
 * change_request window channel plus change_task via the parent-change window.
 */
export function useWeekendChanges(
    service: ChangeService,
    amb: SnowAmb,
    window: WeekendWindow,
    refreshKey: number,
): { changes: ChangeRecord[]; tasks: TaskRecord[]; loading: boolean; error: string | null } {
    const [changes, setChanges] = useState<ChangeRecord[]>([])
    const [tasks, setTasks] = useState<TaskRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(
        async (silent: boolean) => {
            if (!silent) {
                setLoading(true)
                setError(null)
            }
            try {
                const rows = await service.listWeekendChanges(window)
                const taskRows = await service.listWeekendTasks(window)
                setChanges(rows)
                setTasks(taskRows)
                setError(null)
            } catch (err) {
                if (!silent) setError(err instanceof Error ? err.message : 'Failed to load changes')
            } finally {
                if (!silent) setLoading(false)
            }
        },
        [service, window],
    )

    useEffect(() => {
        void load(false)
    }, [load, refreshKey])

    const liveRefresh = useCallback(() => void load(true), [load])
    // Both watches mirror the REST queries exactly: the change_task filter
    // dot-walks to the parent change's planned window, so the channel is
    // stable per window instead of a giant IN-list rebuilt from loaded rows.
    useRecordWatch(amb, 'change_request', weekendChangeQuery(window), liveRefresh)
    useRecordWatch(amb, 'change_task', weekendTaskQuery(window), liveRefresh)

    return { changes, tasks, loading, error }
}
