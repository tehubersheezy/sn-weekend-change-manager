import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChangeService } from './services/ChangeService'
import { ActivityService } from './services/ActivityService'
import { JiraService } from './services/JiraService'
import { UserService } from './services/UserService'
import { useAmbClient } from './hooks/useAmb'
import { useWeekendChanges } from './hooks/useWeekendChanges'
import { useActivityFeed } from './hooks/useActivityFeed'
import { useWeekendCis } from './hooks/useWeekendCis'
import { useJiraSummaries } from './hooks/useJiraSummaries'
import { LlmService } from './services/LlmService'
import { buildPayload } from './prompts'
import { AiReportDialog } from './components/AiReportDialog'
import { jiraIssuesFromTasks } from './components/JiraList'
import {
  DEFAULT_WINDOW_CONFIG,
  getWeekendWindow,
  type WindowConfig,
} from './utils/weekendWindow'
import { isValidTimeZone } from './utils/datetime'
import { TimeZoneProvider } from './context/TimeZone'
import { defaultScreen, phaseByKey, PHASES, type ScreenKey } from './utils/phases'
import { display, value, type SnField } from './utils/fields'
import { groupTasksByChange, taskProgress } from './utils/progress'
import type { ChangeRecord } from './types'
import type { Stat } from './components/StatTiles'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import { TopNav } from './components/TopNav'
import { WindowControls, DEFAULT_LLM_CONFIG, type LlmConfig } from './components/WindowControls'
import { StatTiles } from './components/StatTiles'
import { List as ListIcon, CalendarRange, Table as TableIcon, Sparkles } from 'lucide-react'
import { Button } from './components/ui/button'
import { cn, FOCUS_RING } from './lib/utils'
import { CenteredState, LoadingSkeletons } from './components/ChangeList'
import { PlanList } from './components/PlanList'
import { ExecuteList } from './components/ExecuteList'
import { ReviewList } from './components/ReviewList'
import { TimelineView } from './components/TimelineView'
import { ChangeGridView } from './components/ChangeGridView'
import { type DetailTab } from './components/ChangeDetailView'
import { RecordPane, EMPTY_NAV, type DetailNav } from './components/RecordPane'
import { ActivityFeed } from './components/ActivityFeed'
import { Dialog, DialogContent, DialogTitle } from './components/ui/dialog'
import { runDiagnostics } from './utils/diag'

const APP_TITLE = 'Weekend Change Console'
const CONFIG_KEY = 'wcm.windowConfig'
const LLM_CONFIG_KEY = 'wcm.llmConfig'

/**
 * The AI action, named by what it produces on each screen rather than by the
 * machinery behind it. "Generate" tells a change manager nothing; "Find collisions"
 * would over-promise one section of the answer. These are the three questions the
 * console exists to answer, which is why they read as deliverables.
 */
const AI_ACTION_LABEL: Record<ScreenKey, string> = {
  plan: 'Implementation plan',
  execute: 'Current status',
  review: 'Post-implementation review',
}

/**
 * List and Timeline live in the split layout beside the detail pane; Grid takes
 * the full width — it exists to read and COPY the register as a table, and a
 * half-width spreadsheet is neither.
 */
type ViewKey = 'list' | 'timeline' | 'grid'

function loadWindowConfig(): WindowConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.startTime === 'string' && typeof parsed.endTime === 'string') {
        // Back-compat: a config persisted before the timezone field — or one
        // carrying a zone Intl can't construct — falls back to the browser
        // default rather than crashing (Intl throws RangeError on an unknown zone).
        const timeZone =
          typeof parsed.timeZone === 'string' && isValidTimeZone(parsed.timeZone)
            ? parsed.timeZone
            : DEFAULT_WINDOW_CONFIG.timeZone
        return { startTime: parsed.startTime, endTime: parsed.endTime, timeZone }
      }
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_WINDOW_CONFIG
}

function loadLlmConfig(): LlmConfig {
  try {
    const raw = window.localStorage.getItem(LLM_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.endpoint === 'string' && typeof parsed.token === 'string') return parsed
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_LLM_CONFIG
}

/**
 * The axes of navigation. `id` is the BASE record (a change); `jira`, `person`
 * and `task` are overlays that layer OVER it rather than replacing it — a
 * record is opened FROM a change and closing it returns you there, so both
 * have to survive a reload of `?id=…&jira=…`. Overlays are mutually exclusive.
 */
function urlState(): {
  screen: ScreenKey | null
  id: string | null
  jira: string | null
  person: string | null
  task: string | null
} {
  const params = new URLSearchParams(window.location.search)
  const screen = phaseByKey(params.get('screen'))?.key ?? null
  return {
    screen,
    id: params.get('id'),
    jira: params.get('jira'),
    person: params.get('person'),
    task: params.get('task'),
  }
}

/** Whatever the detail pane is showing names the document. */
function titleFor(recordName?: string): string {
  return recordName ? `${recordName} — ${APP_TITLE}` : APP_TITLE
}

/** The pane selection, as URL params. Absent keys clear their axis. */
interface UrlSelection {
  id?: string | null
  jira?: string | null
  person?: string | null
  task?: string | null
}

/** Push screen + selection into history, bridging to Polaris in an iframe. */
function pushUrl(screen: ScreenKey, sel: UrlSelection, title: string) {
  const params = new URLSearchParams()
  params.set('screen', screen)
  if (sel.id) params.set('id', sel.id)
  if (sel.jira) params.set('jira', sel.jira)
  if (sel.person) params.set('person', sel.person)
  if (sel.task) params.set('task', sel.task)
  const relativePath = `${window.location.pathname}?${params.toString()}`

  if (window.self !== window.top && typeof window.CustomEvent.fireTop === 'function') {
    window.CustomEvent.fireTop('magellanNavigator.permalink.set', { relativePath, title })
    window.history.pushState({ screen, ...sel }, title, relativePath)
  } else {
    window.history.pushState({ screen, ...sel }, title, relativePath)
    document.title = title
  }
}

const isHighRisk = (c: ChangeRecord) => display(c.risk).toLowerCase().includes('high')

/** Distinct reference-field options ({sys_id, display}) present in a change set. */
function refOptions(changes: ChangeRecord[], get: (c: ChangeRecord) => SnField) {
  const seen = new Map<string, string>()
  for (const c of changes) {
    const v = value(get(c))
    const label = display(get(c))
    if (v && label && !seen.has(v)) seen.set(v, label)
  }
  return [...seen.entries()]
    .map(([v, label]) => ({ value: v, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export default function App() {
  const [{ screen, selectedId, jiraKey, personId, taskId }, setNav] = useState<{
    screen: ScreenKey
    selectedId: string | null
    jiraKey: string | null
    personId: string | null
    taskId: string | null
  }>(() => {
    const fromUrl = urlState()
    return {
      screen: fromUrl.screen ?? defaultScreen(getWeekendWindow({ config: loadWindowConfig() })),
      selectedId: fromUrl.id,
      jiraKey: fromUrl.jira,
      personId: fromUrl.person,
      taskId: fromUrl.task,
    }
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [changeNumber, setChangeNumber] = useState<string | undefined>(undefined)
  // Like changeNumber: the open overlay's display name, for the document title.
  const [taskNumber, setTaskNumber] = useState<string | undefined>(undefined)
  const [personName, setPersonName] = useState<string | undefined>(undefined)
  // Which detail tab an opened change lands on. Owned here, not in the detail
  // view: a feed row's task number must reach the Change tasks tab even when
  // that change is already the one on screen (no sysId change to react to).
  const [detailTab, setDetailTab] = useState<DetailTab>('details')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<ViewKey>('list')
  const [groupFilter, setGroupFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')

  const [weekOffset, setWeekOffset] = useState(0)
  const [windowConfig, setWindowConfig] = useState<WindowConfig>(loadWindowConfig)
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(loadLlmConfig)

  const service = useMemo(() => new ChangeService(), [])
  const { amb, status: ambStatus } = useAmbClient()
  const weekendWindow = useMemo(
    () => getWeekendWindow({ offsetWeeks: weekOffset, config: windowConfig }),
    [weekOffset, windowConfig, refreshKey],
  )

  const { changes, tasks, loading, error } = useWeekendChanges(service, amb, weekendWindow, refreshKey)
  const tasksByChange = useMemo(() => groupTasksByChange(tasks), [tasks])

  // The activity feed lives here (not inside its component) so its data
  // survives detail navigation — coming back from a change is instant. Live
  // refresh piggybacks on the arrays' identity, which the AMB watchers renew.
  const activityService = useMemo(() => new ActivityService(), [])
  const feed = useActivityFeed(activityService, weekendWindow, changes, tasks, !loading && !error)

  // Shared by the feed, the Jiras tab and the Jira detail pane, so a key that
  // appears on all three resolves once.
  const jiraService = useMemo(() => new JiraService(), [])

  // sys_user reads for the person page; caches by sys_id for the session.
  const userService = useMemo(() => new UserService(), [])

  // ---- The AI report ------------------------------------------------------
  // Every screen sends the SAME complete window to the model and asks a different
  // question of it (prompts.ts: the phase is a lens, not a filter). So the payload
  // is assembled once here, from data the console already has on screen, and the
  // dialog only chooses which question to ask.
  const [aiOpen, setAiOpen] = useState(false)
  const llmService = useMemo(() => new LlmService(llmConfig), [llmConfig])

  // The two reads the console doesn't otherwise do window-wide. Both feed findings
  // that are invisible per-change: CI collisions, and whether a change's Jira is Done.
  const cis = useWeekendCis(service, changes)
  const jiraKeys = useMemo(() => jiraIssuesFromTasks(tasks).map((i) => i.key), [tasks])
  const jiraSummaries = useJiraSummaries(jiraService, jiraKeys)

  const payload = useMemo(
    () =>
      buildPayload({
        weekend: weekendWindow,
        timeZone: windowConfig.timeZone,
        changes,
        tasks,
        cis,
        events: feed.events,
        jiraSummaries,
      }),
    [weekendWindow, windowConfig.timeZone, changes, tasks, cis, feed.events, jiraSummaries],
  )

  const updateWindowConfig = useCallback((next: WindowConfig) => {
    setWindowConfig(next)
    try {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
    } catch {
      /* persistence is best-effort */
    }
  }, [])

  // LLM connection settings — persisted plumbing with no consumer yet. Mirrors
  // updateWindowConfig's write-through-to-localStorage pattern exactly.
  const updateLlmConfig = useCallback((next: LlmConfig) => {
    setLlmConfig(next)
    try {
      window.localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(next))
    } catch {
      /* persistence is best-effort */
    }
  }, [])

  useEffect(() => {
    const onPop = () => {
      const fromUrl = urlState()
      // The tab isn't in the URL, so a restored change lands on its first tab.
      setDetailTab('details')
      setNav((prev) => ({
        screen: fromUrl.screen ?? prev.screen,
        selectedId: fromUrl.id,
        jiraKey: fromUrl.jira,
        personId: fromUrl.person,
        taskId: fromUrl.task,
      }))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    // Whichever record is on screen names the tab — overlay first, base change last.
    const name = personId
      ? personName
      : taskId
        ? taskNumber
        : (jiraKey ?? (selectedId ? changeNumber : undefined))
    document.title = titleFor(name)
  }, [personId, personName, taskId, taskNumber, jiraKey, selectedId, changeNumber])

  // TEMP diagnostics: dump layout/theme state so we can find why the world
  // clocks vanish on the deployed page. Fires on mount and again after the
  // Polaris theme observer has had time to re-append its stylesheet.
  useEffect(() => {
    runDiagnostics('mount')
    const t = setTimeout(() => runDiagnostics('after-2s'), 2000)
    return () => clearTimeout(t)
  }, [])

  const selectScreen = useCallback(
    (next: ScreenKey) => {
      setFilter('all') // state tabs are phase-scoped; reset on screen switch
      pushUrl(next, { id: selectedId, jira: jiraKey, person: personId, task: taskId }, titleFor())
      setNav((prev) => ({ ...prev, screen: next }))
    },
    [selectedId, jiraKey, personId, taskId],
  )

  /**
   * Open a change, optionally straight onto one of the detail pane's tabs. Any
   * open overlay (Jira issue, person, task) closes — the pane shows one record,
   * and this is now that record.
   */
  const selectChange = useCallback(
    (id: string, tab: DetailTab = 'details') => {
      setChangeNumber(undefined) // clear until the new record loads
      setDetailTab(tab)
      pushUrl(screen, { id }, titleFor())
      setNav((prev) => ({ ...prev, selectedId: id, jiraKey: null, personId: null, taskId: null }))
    },
    [screen],
  )

  /**
   * Open a Jira issue in the detail pane. The change behind it stays SELECTED —
   * it just isn't rendered — so closing the issue returns to it without a refetch,
   * and the list on the left keeps showing it as the current row.
   */
  const openJira = useCallback(
    (key: string) => {
      pushUrl(screen, { id: selectedId, jira: key }, titleFor(key))
      setNav((prev) => ({ ...prev, jiraKey: key, personId: null, taskId: null }))
    },
    [screen, selectedId],
  )

  /**
   * Leave the issue. Back to the change that referenced it, landing on the Jiras
   * tab — that's where the key was clicked, so it's where the user expects to be.
   * With no change behind it (opened from the feed) this falls through to the feed.
   */
  const closeJira = useCallback(() => {
    setDetailTab('jiras')
    pushUrl(screen, { id: selectedId }, titleFor())
    setNav((prev) => ({ ...prev, jiraKey: null }))
  }, [screen, selectedId])

  /** Open a person over whatever change is selected; closing returns to it. */
  const openPerson = useCallback(
    (pid: string) => {
      setPersonName(undefined)
      pushUrl(screen, { id: selectedId, person: pid }, titleFor())
      setNav((prev) => ({ ...prev, personId: pid, jiraKey: null, taskId: null }))
    },
    [screen, selectedId],
  )

  /** Leave the person page. detailTab is untouched — back to the change as it was. */
  const closePerson = useCallback(() => {
    pushUrl(screen, { id: selectedId }, titleFor())
    setNav((prev) => ({ ...prev, personId: null }))
  }, [screen, selectedId])

  /**
   * Open a task's own page. Its parent change becomes the base record — a
   * task's home is its change, so closing lands on the parent's Change tasks
   * tab even when the task was reached from a person page or the feed.
   */
  const openTask = useCallback(
    (taskSysId: string, changeSysId: string) => {
      setTaskNumber(undefined)
      if (changeSysId !== selectedId) setChangeNumber(undefined)
      pushUrl(screen, { id: changeSysId || null, task: taskSysId }, titleFor())
      setNav((prev) => ({
        ...prev,
        selectedId: changeSysId || null,
        taskId: taskSysId,
        jiraKey: null,
        personId: null,
      }))
    },
    [screen, selectedId],
  )

  /** Leave the task, landing on its change's Change tasks tab. */
  const closeTask = useCallback(() => {
    setDetailTab('tasks')
    pushUrl(screen, { id: selectedId }, titleFor())
    setNav((prev) => ({ ...prev, taskId: null }))
  }, [screen, selectedId])

  /** Back to the pane's resting view: the weekend activity feed. */
  const clearSelection = useCallback(() => {
    pushUrl(screen, {}, titleFor())
    setNav((prev) => ({ ...prev, selectedId: null, jiraKey: null, personId: null, taskId: null }))
  }, [screen])

  /**
   * The grid's popout. Records opened from the full-width grid peek in a dialog
   * OVER the grid rather than re-expanding the split layout — the same DetailNav
   * machine as the pane, just not URL-synced (a popout is transient chrome, like
   * the window-settings dialog). The pane's selection stays intact underneath,
   * so flipping back to List restores whatever was open there.
   */
  const [popout, setPopout] = useState<DetailNav>(EMPTY_NAV)
  const [popoutTab, setPopoutTab] = useState<DetailTab>('details')
  const [popoutChangeNumber, setPopoutChangeNumber] = useState<string | undefined>(undefined)
  const popoutIsOpen = Boolean(popout.id || popout.jiraKey || popout.personId || popout.taskId)

  const closePopout = useCallback(() => setPopout(EMPTY_NAV), [])
  const popoutOpenChange = useCallback((id: string, tab: DetailTab = 'details') => {
    setPopoutChangeNumber(undefined)
    setPopoutTab(tab)
    setPopout({ id, jiraKey: null, personId: null, taskId: null })
  }, [])
  const popoutOpenJira = useCallback((key: string) => {
    setPopout((prev) => ({ ...prev, jiraKey: key, personId: null, taskId: null }))
  }, [])
  const popoutOpenPerson = useCallback((pid: string) => {
    setPopout((prev) => ({ ...prev, personId: pid, jiraKey: null, taskId: null }))
  }, [])
  const popoutOpenTask = useCallback((taskSysId: string, changeSysId: string) => {
    setPopoutChangeNumber(undefined)
    setPopout({ id: changeSysId || null, taskId: taskSysId, jiraKey: null, personId: null })
  }, [])
  // Closing an overlay with no change beneath empties the nav — the dialog closes.
  const popoutCloseJira = useCallback(() => {
    setPopoutTab('jiras')
    setPopout((prev) => ({ ...prev, jiraKey: null }))
  }, [])
  const popoutClosePerson = useCallback(() => {
    setPopout((prev) => ({ ...prev, personId: null }))
  }, [])
  const popoutCloseTask = useCallback(() => {
    setPopoutTab('tasks')
    setPopout((prev) => ({ ...prev, taskId: null }))
  }, [])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const phase = phaseByKey(screen) ?? PHASES[0]
  const phaseChanges = useMemo(
    () => changes.filter((c) => phase.states.has(value(c.state))),
    [changes, phase],
  )

  const stats = useMemo<Stat[]>(() => {
    const count = (pred: (c: ChangeRecord) => boolean) => phaseChanges.filter(pred).length
    if (phase.key === 'plan') {
      return [
        { label: 'Total planned', value: phaseChanges.length },
        { label: 'Awaiting approval', value: count((c) => ['-4', '-3'].includes(value(c.state))) },
        { label: 'Scheduled', value: count((c) => value(c.state) === '-2') },
        { label: 'High risk', value: count(isHighRisk) },
      ]
    }
    if (phase.key === 'execute') {
      const inFlight = phaseChanges.filter((c) => value(c.state) === '-1')
      const progress = inFlight
        .map((c) => taskProgress(tasksByChange.get(value(c.sys_id)) ?? []))
        .reduce((acc, p) => ({ done: acc.done + p.done, total: acc.total + p.total }), {
          done: 0,
          total: 0,
        })
      return [
        { label: 'In flight', value: inFlight.length },
        { label: 'Up next', value: count((c) => value(c.state) === '-2') },
        { label: 'Tasks done', value: `${progress.done}/${progress.total}` },
        { label: 'Emergency', value: count((c) => display(c.type) === 'Emergency') },
      ]
    }
    return [
      { label: 'In review', value: count((c) => value(c.state) === '0') },
      { label: 'Closed', value: count((c) => value(c.state) === '3') },
      { label: 'Successful', value: count((c) => value(c.close_code) === 'successful') },
      {
        label: 'With issues',
        value: count((c) => Boolean(value(c.close_code)) && value(c.close_code) !== 'successful'),
      },
    ]
  }, [phase, phaseChanges, tasksByChange])

  // Distinct states present in this phase, lowest state value first.
  const stateTabs = useMemo(() => {
    const seen = new Map<string, string>()
    for (const c of phaseChanges) {
      const v = value(c.state)
      if (!seen.has(v)) seen.set(v, display(c.state) || 'Unknown')
    }
    return [...seen.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([v, label]) => ({ value: v, label }))
  }, [phaseChanges])

  const effectiveFilter = stateTabs.some((t) => t.value === filter) ? filter : 'all'

  // Assignment group / assigned to filter options, from the active phase's changes.
  const groupOptions = useMemo(() => refOptions(phaseChanges, (c) => c.assignment_group), [phaseChanges])
  const assigneeOptions = useMemo(() => refOptions(phaseChanges, (c) => c.assigned_to), [phaseChanges])
  const effGroup = groupOptions.some((o) => o.value === groupFilter) ? groupFilter : 'all'
  const effAssignee = assigneeOptions.some((o) => o.value === assigneeFilter) ? assigneeFilter : 'all'

  const visible = phaseChanges.filter(
    (c) =>
      (effectiveFilter === 'all' || value(c.state) === effectiveFilter) &&
      (effGroup === 'all' || value(c.assignment_group) === effGroup) &&
      (effAssignee === 'all' || value(c.assigned_to) === effAssignee),
  )

  const listProps = { changes: visible, tasksByChange, selectedId, onOpen: selectChange }

  return (
    <TimeZoneProvider zone={windowConfig.timeZone}>
    <div className="flex h-screen flex-col bg-background">
      <TopNav liveStatus={ambStatus} screen={screen} onScreenChange={selectScreen} />

      {/* Full-width header: phase headline, window controls, stats, state filter. */}
      <header data-diag="content-header" className="flex flex-col gap-6 border-b border-border px-8 pb-6 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display-md text-ink">{phase.headline}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{weekendWindow.label}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* The screen's primary action, and the only coral on the header. Each
                phase asks the model its own question — the labels are the questions,
                not a generic "Generate". Disabled until Settings has an endpoint and
                a token: an action that can only fail is worse than one that isn't there. */}
            <Button
              onClick={() => setAiOpen(true)}
              disabled={!llmService.configured || loading || Boolean(error)}
              title={
                llmService.configured
                  ? undefined
                  : 'Set an LLM endpoint and token in Settings to enable this'
              }
            >
              <Sparkles className="size-4" aria-hidden />
              {AI_ACTION_LABEL[phase.key]}
            </Button>
            <WindowControls
              weekOffset={weekOffset}
              onWeekOffset={setWeekOffset}
              config={windowConfig}
              onConfigChange={updateWindowConfig}
              llmConfig={llmConfig}
              onLlmConfigChange={updateLlmConfig}
            />
          </div>
        </div>
        <StatTiles stats={stats} />
      </header>

      {/* Below the header: phase list and detail panel side by side, equal width —
          except in grid view, where the table claims the full width and manages
          its own scroll (sticky header needs the scroll container inside it). */}
      <main
        data-diag="main"
        className={cn('min-h-0 flex-1', view === 'grid' ? 'flex' : 'grid grid-cols-2')}
      >
        <section
          className={cn(
            'min-h-0',
            view === 'grid'
              ? 'flex flex-1 flex-col p-6'
              : 'overflow-y-auto border-r border-border p-6',
          )}
        >
          {/* One toolbar row: everything that scopes this list lives here. */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {!loading && !error && stateTabs.length > 0 && (
              <Tabs value={effectiveFilter} onValueChange={setFilter}>
                <TabsList className="flex-wrap">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {stateTabs.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <RefFilter
                allLabel="All groups"
                options={groupOptions}
                value={effGroup}
                onChange={setGroupFilter}
              />
              <RefFilter
                allLabel="Anyone"
                options={assigneeOptions}
                value={effAssignee}
                onChange={setAssigneeFilter}
              />
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>
          {loading ? (
            <LoadingSkeletons />
          ) : error ? (
            <CenteredState title="Couldn't load changes" action="Try again" onRefresh={refresh}>
              {/* error-ink, not the destructive FILL hue: the five semantic hues are
                  fills, not text colors (DESIGN.md > Colors > Semantic). #c64545 as
                  type on cream is 4.6:1; the -ink step is 6.2:1. */}
              <p className="max-w-md text-body-sm text-error-ink">{error}</p>
            </CenteredState>
          ) : view === 'grid' ? (
            <ChangeGridView
              changes={visible}
              tasksByChange={tasksByChange}
              onOpenChange={popoutOpenChange}
              onOpenJira={popoutOpenJira}
              onOpenPerson={popoutOpenPerson}
              onOpenTask={popoutOpenTask}
            />
          ) : view === 'timeline' ? (
            <TimelineView
              changes={visible}
              window={weekendWindow}
              selectedId={selectedId}
              onOpen={selectChange}
            />
          ) : phase.key === 'plan' ? (
            <PlanList {...listProps} />
          ) : phase.key === 'execute' ? (
            <ExecuteList {...listProps} />
          ) : (
            <ReviewList {...listProps} />
          )}
        </section>
        {/*
         * The detail pane shows exactly one thing, and an overlay (Jira issue,
         * person, task) OUTRANKS the change behind it — you opened it from the
         * change, so it's the nearer record. RecordPane owns that precedence,
         * shared with the grid's popout below.
         *
         * In grid view the pane isn't rendered at all — the selection survives in
         * the URL, so flipping back to List restores whatever was open.
         */}
        {view !== 'grid' && (
          <section className="min-h-0 overflow-y-auto">
            <RecordPane
              nav={{ id: selectedId, jiraKey, personId, taskId }}
              rootLabel="Weekend activity"
              tab={detailTab}
              onTabChange={setDetailTab}
              changeNumber={changeNumber}
              onChangeLoaded={setChangeNumber}
              onTaskLoaded={setTaskNumber}
              onPersonLoaded={setPersonName}
              service={service}
              jiraService={jiraService}
              userService={userService}
              amb={amb}
              refreshKey={refreshKey}
              changes={changes}
              tasks={tasks}
              tasksByChange={tasksByChange}
              onOpenChange={selectChange}
              onOpenJira={openJira}
              onOpenPerson={openPerson}
              onOpenTask={openTask}
              onCloseJira={closeJira}
              onClosePerson={closePerson}
              onCloseTask={closeTask}
              onBackFromChange={clearSelection}
              resting={
                <ActivityFeed
                  events={feed.events}
                  loading={feed.loading}
                  error={feed.error}
                  changes={changes}
                  tasks={tasks}
                  onOpen={selectChange}
                  onOpenJira={openJira}
                />
              }
            />
          </section>
        )}
      </main>

      {/* The grid's popout: records opened from the grid peek here, over the
          grid, instead of re-expanding the split layout. */}
      <Dialog
        open={popoutIsOpen}
        onOpenChange={(open) => {
          if (!open) closePopout()
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] max-w-4xl overflow-y-auto p-0"
        >
          <DialogTitle className="sr-only">Record detail</DialogTitle>
          <RecordPane
            nav={popout}
            rootLabel="Grid"
            tab={popoutTab}
            onTabChange={setPopoutTab}
            changeNumber={popoutChangeNumber}
            onChangeLoaded={setPopoutChangeNumber}
            service={service}
            jiraService={jiraService}
            userService={userService}
            amb={amb}
            refreshKey={refreshKey}
            changes={changes}
            tasks={tasks}
            tasksByChange={tasksByChange}
            onOpenChange={popoutOpenChange}
            onOpenJira={popoutOpenJira}
            onOpenPerson={popoutOpenPerson}
            onOpenTask={popoutOpenTask}
            onCloseJira={popoutCloseJira}
            onClosePerson={popoutClosePerson}
            onCloseTask={popoutCloseTask}
            onBackFromChange={closePopout}
            resting={null}
          />
        </DialogContent>
      </Dialog>

      {/* The weekend report. Generates on open against the current phase's question
          and the whole window's payload; aborts on close. */}
      <AiReportDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        screen={phase.key}
        payload={payload}
        service={llmService}
      />
    </div>
    </TimeZoneProvider>
  )
}

function RefFilter({
  allLabel,
  options,
  value: selected,
  onChange,
}: {
  allLabel: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-36 text-caption">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewKey
  onChange: (view: ViewKey) => void
}) {
  const options = [
    { key: 'list' as const, label: 'List', Icon: ListIcon },
    { key: 'timeline' as const, label: 'Timeline', Icon: CalendarRange },
    { key: 'grid' as const, label: 'Grid', Icon: TableIcon },
  ]
  return (
    <div className="flex items-center gap-1">
      {options.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          aria-pressed={view === key}
          aria-label={`${label} view`}
          title={`${label} view`}
          onClick={() => onChange(key)}
          className={cn(
            'inline-flex items-center rounded-md p-2 transition-colors',
            FOCUS_RING,
            // The active view is home and doesn't warm; the others take the
            // warm tier's peach wash on hover.
            view === key
              ? 'bg-surface-card text-ink'
              : 'text-muted-foreground hover:bg-hover-surface',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
