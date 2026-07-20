import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { TaskRecord } from '../types'
import type { ChangeService } from '../services/ChangeService'
import type { SnowAmb } from '../services/SnowAmb'
import { useRecordWatch } from '../hooks/useAmb'
import { display, value } from '../utils/fields'
import { formatDateTime, parseSnDate, zoneAbbreviation } from '../utils/datetime'
import { useTimeZone } from '../context/TimeZone'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { TaskStateBadge } from './StateBadge'
import { PersonBadge } from './PersonBadge'
import { JiraLink, RecordLink } from './InlineLink'

/**
 * A change_task, as its own page. Mirrors ChangeDetailView's anatomy — back
 * affordance, caption number, serif headline, badge row, muted meta row — one
 * size down: a task has no tabs, just its facts and a description.
 *
 * The back affordance names the task's HOME: its parent change (falling back to
 * the caller's label until the record loads, or when a deep link has no change
 * behind it). Closing a task always lands on the parent's Change tasks tab —
 * the flat-layering rule the Jira pane established.
 */
export function TaskDetailView({
  service,
  amb,
  sysId,
  refreshKey,
  backLabel,
  onBack,
  onLoaded,
  onOpenChange,
  onOpenPerson,
  onOpenJira,
}: {
  service: ChangeService
  amb: SnowAmb
  sysId: string
  refreshKey: number
  /** Fallback back-affordance label while the task (and its parent) load. */
  backLabel: string
  onBack: () => void
  onLoaded?: (taskNumber: string) => void
  onOpenChange: (changeSysId: string) => void
  onOpenPerson: (personSysId: string) => void
  onOpenJira: (key: string) => void
}) {
  const zone = useTimeZone()
  const [task, setTask] = useState<TaskRecord | null>(null)
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
        const t = await service.getTask(sysId)
        setTask(t)
        setError(null)
        if (t) onLoaded?.(display(t.number))
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Failed to load task')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [service, sysId, onLoaded],
  )

  useEffect(() => {
    void load(false)
  }, [load, refreshKey])

  const liveRefresh = useCallback(() => void load(true), [load])
  useRecordWatch(amb, 'change_task', `sys_id=${sysId}`, liveRefresh)

  const start = task && parseSnDate(value(task.planned_start_date))
  const end = task && parseSnDate(value(task.planned_end_date))
  // Abbreviation omitted when the task carries no planned dates (common) so the
  // meta row reads '— → —' rather than dangling a lone zone code.
  const windowInstant = start || end
  const dateAbbr = windowInstant ? zoneAbbreviation(zone, windowInstant) : ''
  const jiraKey = task ? display(task.correlation_display) : ''
  const changeId = task ? value(task.change_request) : ''
  const assigneeId = task ? value(task.assigned_to) : ''

  return (
    <div className="flex flex-col gap-8 px-8 py-8">
      <div className="-mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3.5 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft />
          {(task && display(task.change_request)) || backLabel}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : error || !task ? (
        <div className="rounded-lg border border-border py-16 text-center">
          <p className="text-body-sm text-error-ink">{error || 'Change task not found.'}</p>
        </div>
      ) : (
        // Content arrival: mounts when the (non-silent) load resolves — the
        // rise fires on every record switch, never on a silent AMB refetch.
        <div className="flex animate-rise-in flex-col gap-8">
          <header className="flex flex-col gap-4">
            <div className="font-sans text-caption text-muted-foreground">
              {display(task.number)}
            </div>
            {/* h2, not h1: app.tsx owns the page's h1 (the phase headline). */}
            <h2 className="text-display-sm text-ink">
              {display(task.short_description) || 'Untitled task'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <TaskStateBadge state={task.state} />
              {/* The task's type (Planning / Implementation / Testing / Review) — a
                  neutral cream pill, the same register ChangeDetailView gives the
                  change's own type. Dropped when empty (10 of the window's tasks
                  carry none) rather than rendering a blank chip. */}
              {display(task.change_task_type) && (
                <Badge variant="pill">{display(task.change_task_type)}</Badge>
              )}
              {jiraKey && <JiraLink issueKey={jiraKey} onOpen={onOpenJira} />}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-muted-foreground">
              {assigneeId ? (
                <PersonBadge
                  name={display(task.assigned_to) || 'Unknown'}
                  size="sm"
                  onOpen={() => onOpenPerson(assigneeId)}
                />
              ) : (
                <span>Unassigned</span>
              )}
              {changeId ? (
                <span className="inline-flex items-center gap-1.5">
                  <span>Part of</span>
                  <RecordLink
                    title={`Open ${display(task.change_request)}`}
                    onClick={() => onOpenChange(changeId)}
                  >
                    <span className="text-caption">{display(task.change_request)}</span>
                  </RecordLink>
                </span>
              ) : null}
              <span>
                {formatDateTime(start, zone)} <span className="text-muted-soft">→</span>{' '}
                {formatDateTime(end, zone)}
                {dateAbbr && ` ${dateAbbr}`}
              </span>
            </div>
          </header>

          {display(task.description) ? (
            <p className="whitespace-pre-wrap text-body-md text-body-text">
              {display(task.description)}
            </p>
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">
              No description on this task.
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
