import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChangeService } from './services/ChangeService'
import { useAmbClient } from './hooks/useAmb'
import { useWeekendChanges } from './hooks/useWeekendChanges'
import {
  DEFAULT_WINDOW_CONFIG,
  getWeekendWindow,
  type WindowConfig,
} from './utils/weekendWindow'
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
import { WindowControls } from './components/WindowControls'
import { StatTiles } from './components/StatTiles'
import { List as ListIcon, CalendarRange } from 'lucide-react'
import { cn } from './lib/utils'
import { CenteredState, LoadingSkeletons } from './components/ChangeList'
import { PlanList } from './components/PlanList'
import { ExecuteList } from './components/ExecuteList'
import { ReviewList } from './components/ReviewList'
import { TimelineView } from './components/TimelineView'
import { ChangeDetailView } from './components/ChangeDetailView'
import { runDiagnostics } from './utils/diag'

const APP_TITLE = 'Weekend Change Console'
const CONFIG_KEY = 'wcm.windowConfig'

function loadWindowConfig(): WindowConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.startTime === 'string' && typeof parsed.endTime === 'string') return parsed
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_WINDOW_CONFIG
}

function urlState(): { screen: ScreenKey | null; id: string | null } {
  const params = new URLSearchParams(window.location.search)
  const screen = phaseByKey(params.get('screen'))?.key ?? null
  return { screen, id: params.get('id') }
}

function titleFor(changeNumber?: string): string {
  return changeNumber ? `${changeNumber} — ${APP_TITLE}` : APP_TITLE
}

/** Push screen + selection into history, bridging to Polaris in an iframe. */
function pushUrl(screen: ScreenKey, id: string | null, title: string) {
  const params = new URLSearchParams()
  params.set('screen', screen)
  if (id) params.set('id', id)
  const relativePath = `${window.location.pathname}?${params.toString()}`

  if (window.self !== window.top && typeof window.CustomEvent.fireTop === 'function') {
    window.CustomEvent.fireTop('magellanNavigator.permalink.set', { relativePath, title })
    window.history.pushState({ screen, id }, title, relativePath)
  } else {
    window.history.pushState({ screen, id }, title, relativePath)
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
  const [{ screen, selectedId }, setNav] = useState<{ screen: ScreenKey; selectedId: string | null }>(() => {
    const fromUrl = urlState()
    return {
      screen: fromUrl.screen ?? defaultScreen(getWeekendWindow({ config: loadWindowConfig() })),
      selectedId: fromUrl.id,
    }
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [changeNumber, setChangeNumber] = useState<string | undefined>(undefined)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'list' | 'timeline'>('list')
  const [groupFilter, setGroupFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')

  const [weekOffset, setWeekOffset] = useState(0)
  const [windowConfig, setWindowConfig] = useState<WindowConfig>(loadWindowConfig)

  const service = useMemo(() => new ChangeService(), [])
  const { amb, status: ambStatus } = useAmbClient()
  const weekendWindow = useMemo(
    () => getWeekendWindow({ offsetWeeks: weekOffset, config: windowConfig }),
    [weekOffset, windowConfig, refreshKey],
  )

  const { changes, tasks, loading, error } = useWeekendChanges(service, amb, weekendWindow, refreshKey)
  const tasksByChange = useMemo(() => groupTasksByChange(tasks), [tasks])

  const updateWindowConfig = useCallback((next: WindowConfig) => {
    setWindowConfig(next)
    try {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
    } catch {
      /* persistence is best-effort */
    }
  }, [])

  useEffect(() => {
    const onPop = () => {
      const fromUrl = urlState()
      setNav((prev) => ({ screen: fromUrl.screen ?? prev.screen, selectedId: fromUrl.id }))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    document.title = titleFor(selectedId ? changeNumber : undefined)
  }, [selectedId, changeNumber])

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
      pushUrl(next, selectedId, titleFor())
      setNav((prev) => ({ ...prev, screen: next }))
    },
    [selectedId],
  )

  const selectChange = useCallback(
    (id: string) => {
      setChangeNumber(undefined) // clear until the new record loads
      pushUrl(screen, id, titleFor())
      setNav((prev) => ({ ...prev, selectedId: id }))
    },
    [screen],
  )

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
    <div className="flex h-screen flex-col bg-background">
      <TopNav liveStatus={ambStatus} screen={screen} onScreenChange={selectScreen} />

      {/* Full-width header: phase headline, window controls, stats, state filter. */}
      <header data-diag="content-header" className="flex flex-col gap-6 border-b border-border px-8 pb-6 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[36px] leading-[1.15] tracking-[-0.5px] text-ink">
              {phase.headline}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{weekendWindow.label}</p>
          </div>
          <WindowControls
            weekOffset={weekOffset}
            onWeekOffset={setWeekOffset}
            config={windowConfig}
            onConfigChange={updateWindowConfig}
          />
        </div>
        <StatTiles stats={stats} />
      </header>

      {/* Below the header: phase list and detail panel side by side, equal width. */}
      <main data-diag="main" className="grid min-h-0 flex-1 grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-r border-border p-6">
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
              <p className="max-w-md text-sm text-destructive">{error}</p>
            </CenteredState>
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
        <section className="min-h-0 overflow-y-auto">
          {selectedId ? (
            <ChangeDetailView
              service={service}
              amb={amb}
              sysId={selectedId}
              refreshKey={refreshKey}
              onLoaded={setChangeNumber}
            />
          ) : (
            <EmptyDetailPane />
          )}
        </section>
      </main>
    </div>
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
      <SelectTrigger className="h-8 w-36 text-[13px]">
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
  view: 'list' | 'timeline'
  onChange: (view: 'list' | 'timeline') => void
}) {
  const options = [
    { key: 'list' as const, label: 'List', Icon: ListIcon },
    { key: 'timeline' as const, label: 'Timeline', Icon: CalendarRange },
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
            'inline-flex items-center rounded-md p-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15',
            view === key ? 'bg-surface-card text-ink' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}

function EmptyDetailPane() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <h2 className="text-[28px] leading-[1.2] tracking-[-0.3px] text-ink">Select a change</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a change from the list to see its plans, tasks, and affected CIs here.
        </p>
      </div>
    </div>
  )
}
