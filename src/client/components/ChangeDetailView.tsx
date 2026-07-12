import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { AffectedCiRecord, ChangeRecord, TaskRecord } from '../types'
import type { ChangeService } from '../services/ChangeService'
import type { JiraService } from '../services/JiraService'
import type { SnowAmb } from '../services/SnowAmb'
import { useRecordWatch } from '../hooks/useAmb'
import { useJiraSummaries } from '../hooks/useJiraSummaries'
import { display, value } from '../utils/fields'
import { formatDateTime, parseSnDate } from '../utils/datetime'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { StateBadge } from './StateBadge'
import { PersonBadge } from './PersonBadge'
import { PlanCard } from './PlanCard'
import { TaskList } from './TaskList'
import { CiList } from './CiList'
import { JiraList, jiraIssuesFromTasks } from './JiraList'

/** The detail pane's tabs. Callers open a change straight onto one of these. */
export type DetailTab = 'details' | 'tasks' | 'cis' | 'jiras'

export function ChangeDetailView({
  service,
  jiraService,
  amb,
  sysId,
  refreshKey,
  tab,
  onTabChange,
  onLoaded,
  backLabel = 'Weekend activity',
  onBack,
  onOpenJira,
  onOpenTask,
  onOpenPerson,
}: {
  service: ChangeService
  jiraService: JiraService
  amb: SnowAmb
  sysId: string
  refreshKey: number
  /**
   * Controlled by the shell, not held here: opening a change from a feed row's
   * task number has to land on the Change tasks tab even when that change is
   * already the one on screen (no sysId change to react to).
   */
  tab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onLoaded?: (changeNumber: string) => void
  /** What the back affordance names — the feed in the pane, the grid in a popout. */
  backLabel?: string
  /** Return to the surface's resting view (feed), or close the popout. */
  onBack?: () => void
  /** Open a Jira issue in this surface. The change stays selected behind it. */
  onOpenJira: (key: string) => void
  /** Open a change task's own page in this surface. */
  onOpenTask?: (taskSysId: string, changeSysId: string) => void
  /** Open a person's page in this surface. */
  onOpenPerson?: (personSysId: string) => void
}) {
  const [change, setChange] = useState<ChangeRecord | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [cis, setCis] = useState<AffectedCiRecord[]>([])
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

  // Jira issues ride on the change tasks (correlation_display holds the key);
  // the scoped REST API turns those keys into issue summaries. On this tab the
  // issues ARE the content, so the summaries are worth the round-trip — unlike
  // the activity feed, where a bare key is the right density.
  const jiras = useMemo(() => jiraIssuesFromTasks(tasks), [tasks])
  const jiraKeys = useMemo(() => jiras.map((j) => j.key), [jiras])
  const jiraSummaries = useJiraSummaries(jiraService, jiraKeys)

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
            {backLabel}
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
          <p className="text-body-sm text-error-ink">{error || 'Change not found.'}</p>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-4">
            <div className="font-sans text-caption text-muted-foreground">
              {display(change.number)}
            </div>
            {/* h2, not h1: app.tsx owns the page's h1 (the phase headline), and
                this pane is its sibling — same level as the list pane's heading. */}
            <h2 className="text-display-sm text-ink">
              {display(change.short_description) || 'Untitled change'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge state={change.state} />
              {display(change.type) && <Badge variant="pill">{display(change.type)}</Badge>}
              {display(change.risk) && <Badge variant="pill">Risk: {display(change.risk)}</Badge>}
              {display(change.priority) && (
                <Badge variant="pill">Priority: {display(change.priority)}</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-muted-foreground">
              {/* The person on the hook is a record — a badge that opens them —
                  not a string. Unassigned stays plain text: no dead buttons. */}
              {value(change.assigned_to) && onOpenPerson ? (
                <PersonBadge
                  name={display(change.assigned_to) || 'Unknown'}
                  size="sm"
                  onOpen={() => onOpenPerson(value(change.assigned_to))}
                />
              ) : (
                <span>{display(change.assigned_to) || 'Unassigned'}</span>
              )}
              <span>{display(change.assignment_group) || 'No assignment group'}</span>
              <span>
                {formatDateTime(start)} → {formatDateTime(end)} ET
              </span>
            </div>
          </header>

          <Tabs value={tab} onValueChange={(next) => onTabChange(next as DetailTab)}>
            {/* The count leads the label and stays recessive against it. It reads
                that way by WEIGHT, not by lightness: TabsTrigger is already
                `text-muted-foreground font-medium` when inactive, so a count
                tinted muted-foreground would be invisible-as-a-distinction on
                every unselected tab. font-normal against the trigger's 500 holds
                on both states, and keeps the count off muted-soft (2.8:1 on the
                active tab's surface-card fill — the worst contrast in the pane). */}
            <TabsList className="flex-wrap">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1.5">
                <span className="font-normal text-muted-foreground">{tasks.length}</span>
                {tasks.length === 1 ? 'Change task' : 'Change tasks'}
              </TabsTrigger>
              <TabsTrigger value="cis" className="gap-1.5">
                <span className="font-normal text-muted-foreground">{cis.length}</span>
                {cis.length === 1 ? 'Affected CI' : 'Affected CIs'}
              </TabsTrigger>
              <TabsTrigger value="jiras" className="gap-1.5">
                <span className="font-normal text-muted-foreground">{jiras.length}</span>
                {jiras.length === 1 ? 'Jira' : 'Jiras'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex flex-col gap-6">
              {display(change.description) && (
                <p className="whitespace-pre-wrap text-body-md text-body-text">
                  {display(change.description)}
                </p>
              )}

              {/* Close notes are a PlanCard by another name — the same quiet
                  recessive panel, and they read as one family. The surface used
                  to be a success/15 green, which is the fourth surface tone
                  DESIGN.md's iteration guide rules out ("no purple cards, no
                  green sections"); the semantic read belongs in the label, where
                  success-ink is 5.5:1 on the soft cream. The old label painted
                  the fill hue as type and measured 2.2:1. */}
              {closed && display(change.close_notes) && (
                <div className="rounded-lg bg-surface-soft p-5">
                  <div className="text-caption-upper font-medium uppercase text-success-ink">
                    Close notes
                  </div>
                  <p className="mt-2 whitespace-pre-wrap font-sans text-body-sm text-body-text">
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
              <TaskList tasks={tasks} onOpenTask={onOpenTask} onOpenPerson={onOpenPerson} />
            </TabsContent>

            <TabsContent value="cis">
              <CiList cis={cis} />
            </TabsContent>

            <TabsContent value="jiras">
              <JiraList issues={jiras} summaries={jiraSummaries} onOpen={onOpenJira} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
