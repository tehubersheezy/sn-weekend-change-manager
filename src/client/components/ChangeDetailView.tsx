import { useCallback, useEffect, useState } from 'react'
import type { ChangeRecord, TaskRecord } from '../types'
import type { ChangeService } from '../services/ChangeService'
import type { SnowAmb } from '../services/SnowAmb'
import { useRecordWatch } from '../hooks/useAmb'
import { display, value } from '../utils/fields'
import { formatDateTime, parseSnDate } from '../utils/datetime'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { StateBadge } from './StateBadge'
import { PlanCard } from './PlanCard'
import { TaskList } from './TaskList'

export function ChangeDetailView({
  service,
  amb,
  sysId,
  refreshKey,
  onLoaded,
}: {
  service: ChangeService
  amb: SnowAmb
  sysId: string
  refreshKey: number
  onLoaded?: (changeNumber: string) => void
}) {
  const [change, setChange] = useState<ChangeRecord | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // silent=true refetches in place (live AMB updates) without the skeleton flash.
  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const [c, t] = await Promise.all([
          service.getChange(sysId),
          service.listTasksForChange(sysId),
        ])
        setChange(c)
        setTasks(t)
        setError(null)
        if (c) onLoaded?.(display(c.number))
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Failed to load change')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [service, sysId, onLoaded],
  )

  useEffect(() => {
    void load(false)
  }, [load, refreshKey])

  // Live updates for the open change and its tasks.
  const liveRefresh = useCallback(() => void load(true), [load])
  useRecordWatch(amb, 'change_request', `sys_id=${sysId}`, liveRefresh)
  useRecordWatch(amb, 'change_task', `change_request=${sysId}`, liveRefresh)

  const start = change && parseSnDate(value(change.start_date))
  const end = change && parseSnDate(value(change.end_date))

  return (
    <div className="flex flex-col gap-8 px-8 py-8">
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : error || !change ? (
        <div className="rounded-lg border border-border py-16 text-center">
          <p className="text-sm text-destructive">{error || 'Change not found.'}</p>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-4">
            <div className="font-sans text-[13px] text-muted-foreground">
              {display(change.number)}
            </div>
            <h1 className="text-[28px] leading-[1.2] tracking-[-0.3px] text-ink">
              {display(change.short_description) || 'Untitled change'}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge state={change.state} />
              {display(change.type) && <Badge variant="pill">{display(change.type)}</Badge>}
              {display(change.risk) && <Badge variant="pill">Risk: {display(change.risk)}</Badge>}
              {display(change.priority) && (
                <Badge variant="pill">Priority: {display(change.priority)}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted-soft">
              <span>{display(change.assignment_group) || 'No assignment group'}</span>
              <span>
                {formatDateTime(start)} → {formatDateTime(end)} ET
              </span>
            </div>
          </header>

          {display(change.description) && (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-body-text">
              {display(change.description)}
            </p>
          )}

          {value(change.state) === '3' && display(change.close_notes) && (
            <div className="rounded-lg bg-success/15 p-6">
              <div className="text-xs font-medium uppercase tracking-[1.5px] text-success">
                Close notes
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-body-text">
                {display(change.close_notes)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <PlanCard label="Implementation plan" text={display(change.implementation_plan)} />
            <PlanCard label="Backout plan" text={display(change.backout_plan)} />
            <PlanCard label="Test plan" text={display(change.test_plan)} />
          </div>

          <section className="flex flex-col gap-4">
            <div className="font-sans text-lg font-medium text-ink">Change tasks</div>
            <TaskList tasks={tasks} />
          </section>
        </>
      )}
    </div>
  )
}
