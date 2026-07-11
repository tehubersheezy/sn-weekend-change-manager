import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { AffectedCiRecord, ChangeRecord, TaskRecord } from '../types'
import type { ChangeService } from '../services/ChangeService'
import type { SnowAmb } from '../services/SnowAmb'
import { useRecordWatch } from '../hooks/useAmb'
import { display, value } from '../utils/fields'
import { formatDateTime, parseSnDate } from '../utils/datetime'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { StateBadge } from './StateBadge'
import { PlanCard } from './PlanCard'
import { TaskList } from './TaskList'
import { CiList } from './CiList'
import { JiraList, jiraIssuesFromTasks } from './JiraList'

export function ChangeDetailView({
  service,
  amb,
  sysId,
  refreshKey,
  onLoaded,
  onBack,
}: {
  service: ChangeService
  amb: SnowAmb
  sysId: string
  refreshKey: number
  onLoaded?: (changeNumber: string) => void
  /** Return to the pane's resting view (the weekend activity feed). */
  onBack?: () => void
}) {
  const [change, setChange] = useState<ChangeRecord | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [cis, setCis] = useState<AffectedCiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('details')

  // Opening a different change resets the pane to its first tab.
  useEffect(() => {
    setTab('details')
  }, [sysId])

  // silent=true refetches in place (live AMB updates) without the skeleton flash.
  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const [c, t, ci] = await Promise.all([
          service.getChange(sysId),
          service.listTasksForChange(sysId),
          service.listAffectedCis(sysId),
        ])
        setChange(c)
        setTasks(t)
        setCis(ci)
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

  // Live updates for the open change, its tasks, and its affected CIs.
  const liveRefresh = useCallback(() => void load(true), [load])
  useRecordWatch(amb, 'change_request', `sys_id=${sysId}`, liveRefresh)
  useRecordWatch(amb, 'change_task', `change_request=${sysId}`, liveRefresh)
  useRecordWatch(amb, 'task_ci', `task=${sysId}`, liveRefresh)

  // Jira issues ride on the change tasks (correlation_display holds the key).
  const jiras = useMemo(() => jiraIssuesFromTasks(tasks), [tasks])

  const start = change && parseSnDate(value(change.start_date))
  const end = change && parseSnDate(value(change.end_date))

  const closed = !!change && value(change.state) === '3'
  const hasPlans =
    !!change &&
    [change.implementation_plan, change.backout_plan, change.test_plan].some(
      (f) => display(f).trim() !== '',
    )
  const hasDetailContent =
    !!change &&
    (!!display(change.description) || (closed && !!display(change.close_notes)) || hasPlans)

  return (
    <div className="flex flex-col gap-8 px-8 py-8">
      {onBack && (
        <div className="-mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3.5 text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft />
            Weekend activity
          </Button>
        </div>
      )}
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

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1.5">
                <span className="text-muted-soft">{tasks.length}</span>
                {tasks.length === 1 ? 'Change task' : 'Change tasks'}
              </TabsTrigger>
              <TabsTrigger value="cis" className="gap-1.5">
                <span className="text-muted-soft">{cis.length}</span>
                {cis.length === 1 ? 'Affected CI' : 'Affected CIs'}
              </TabsTrigger>
              <TabsTrigger value="jiras" className="gap-1.5">
                <span className="text-muted-soft">{jiras.length}</span>
                {jiras.length === 1 ? 'Jira' : 'Jiras'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex flex-col gap-6">
              {display(change.description) && (
                <p className="whitespace-pre-wrap text-base leading-relaxed text-body-text">
                  {display(change.description)}
                </p>
              )}

              {closed && display(change.close_notes) && (
                <div className="rounded-lg bg-success/15 p-6">
                  <div className="text-xs font-medium uppercase tracking-[1.5px] text-success">
                    Close notes
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-body-text">
                    {display(change.close_notes)}
                  </p>
                </div>
              )}

              {hasPlans && (
                <div className="flex flex-col gap-4">
                  <PlanCard label="Implementation plan" text={display(change.implementation_plan)} />
                  <PlanCard label="Backout plan" text={display(change.backout_plan)} />
                  <PlanCard label="Test plan" text={display(change.test_plan)} />
                </div>
              )}

              {!hasDetailContent && (
                <Card className="p-6 text-sm text-muted-foreground">
                  No description or plans on this change.
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks">
              <TaskList tasks={tasks} />
            </TabsContent>

            <TabsContent value="cis">
              <CiList cis={cis} />
            </TabsContent>

            <TabsContent value="jiras">
              <JiraList issues={jiras} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
