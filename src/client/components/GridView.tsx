import { useMemo, useState, type ReactNode } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import type { AffectedCiRecord, ChangeRecord, TaskRecord } from '../types'
import { cn, FOCUS_RING } from '../lib/utils'
import { display, value, type SnField } from '../utils/fields'
import { formatDateTime, parseSnDate } from '../utils/datetime'
import { regionForChange, regionRank } from '../utils/regions'
import { useTimeZone } from '../context/TimeZone'
import { jiraIssuesFromTasks } from './JiraList'
import { Badge } from './ui/badge'
import { TaskStateBadge } from './StateBadge'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { JiraLink, RecordLink } from './InlineLink'
import { PersonBadge } from './PersonBadge'
import { DataGrid } from './DataGrid'
import { JiraStatusBadge } from './JiraBadges'
import { useJiraSummaries } from '../hooks/useJiraSummaries'
import type { JiraIssueSummary, JiraService } from '../services/JiraService'

const EMPTY = '—'

/**
 * Which projection of the weekend the grid is showing. These are the grid's
 * TOP-LEVEL tabs: the toolbar's group/assignee filters scope the CHANGE
 * population, and each tab projects a different record type OUT of that
 * population — a task shows because its change is in view, a CI because a
 * change in view touches it, a Jira because a task in view names it, a person
 * because something in view is assigned to them. The STATE filter is not part
 * of that scoping: it lives on (and applies to) the Change requests tab only.
 */
type GridTab = 'changes' | 'tasks' | 'cis' | 'jiras' | 'people'

/** How the Change requests tab arranges its rows — grouping is an OPTION. */
type ChangeGrouping = 'none' | 'region'

// ---------------------------------------------------------------------------
// Row shapes. Every string field is BOTH the rendered text and the clipboard
// text — the copy promise is "what you see is what you paste", so the two are
// never computed separately. Columns whose cells render richer JSX (pills,
// chips, badges) keep their plain-text twin as the column accessor, which is
// what getValue() — and therefore DataGrid's copy matrix — reads.
// ---------------------------------------------------------------------------

/** One change flattened for the grid. */
interface ChangeRow {
  sysId: string
  number: string
  description: string
  start: string
  end: string
  assignee: string
  assigneeId: string
  tasks: TaskRecord[]
  taskText: string
  jiraKeys: string[]
  jiraText: string
  /** Everyone with a hand in this change — change assignee first, then task
      assignees in task order, deduped by sys_id. */
  people: { id: string; name: string }[]
  everyone: string
  /** Section grouping key — see utils/regions.ts (placeholder logic for now). */
  region: string
}

/** One change task, carrying its parent change for navigation and context. */
interface TaskRow {
  sysId: string
  changeSysId: string
  number: string
  description: string
  /** Raw field for the badge; stateText is its copyable twin. */
  state: SnField
  stateText: string
  changeNumber: string
  start: string
  end: string
  assignee: string
  assigneeId: string
  jiraKey: string
  jiraText: string
}

/** One DISTINCT CI across the visible changes — task_ci rows fold into it. */
interface CiRow {
  ciId: string
  name: string
  ciClass: string
  status: string
  changes: { sysId: string; number: string }[]
  changeText: string
}

/**
 * One DISTINCT Jira key across the visible tasks. `resolved` is the batch
 * summary lookup's answer and may be absent — a key with no summary still rows
 * (the projection is "what keys does this weekend name", not "what Jira knows").
 */
interface JiraRow {
  key: string
  summary: string
  statusText: string
  resolved: JiraIssueSummary | undefined
  assignee: string
  tasks: { sysId: string; changeSysId: string; number: string }[]
  taskText: string
  changes: { sysId: string; number: string }[]
  changeText: string
}

/** One person with a hand in the visible weekend — as change or task assignee. */
interface PersonRow {
  id: string
  name: string
  changes: { sysId: string; number: string }[]
  changeText: string
  tasks: { sysId: string; changeSysId: string; number: string }[]
  taskText: string
  groupText: string
}

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

/** Rows come back in the service's own order; grouping re-sorts a COPY later. */
function buildChangeRows(
  changes: ChangeRecord[],
  tasksByChange: Map<string, TaskRecord[]>,
  zone: string,
): ChangeRow[] {
  return changes.map((c) => {
    const sysId = value(c.sys_id)
    const tasks = tasksByChange.get(sysId) ?? []
    const jiraKeys = jiraIssuesFromTasks(tasks).map((i) => i.key)

    const people: { id: string; name: string }[] = []
    const seenPeople = new Set<string>()
    const addPerson = (field: SnField) => {
      const id = value(field)
      const name = display(field).trim()
      if (id && name && !seenPeople.has(id)) {
        seenPeople.add(id)
        people.push({ id, name })
      }
    }
    addPerson(c.assigned_to)
    for (const t of tasks) addPerson(t.assigned_to)

    return {
      sysId,
      number: display(c.number) || EMPTY,
      description: display(c.short_description) || 'Untitled change',
      start: formatDateTime(parseSnDate(value(c.start_date)), zone),
      end: formatDateTime(parseSnDate(value(c.end_date)), zone),
      assignee: display(c.assigned_to) || EMPTY,
      assigneeId: value(c.assigned_to),
      tasks,
      taskText: tasks.map((t) => display(t.number)).filter(Boolean).join(', ') || EMPTY,
      jiraKeys,
      jiraText: jiraKeys.join(', ') || EMPTY,
      people,
      everyone: people.map((p) => p.name).join(', ') || EMPTY,
      region: regionForChange(c),
    }
  })
}

function buildTaskRows(
  changes: ChangeRecord[],
  tasksByChange: Map<string, TaskRecord[]>,
  zone: string,
): TaskRow[] {
  const rows: TaskRow[] = []
  for (const c of changes) {
    const changeSysId = value(c.sys_id)
    const changeNumber = display(c.number) || EMPTY
    for (const t of tasksByChange.get(changeSysId) ?? []) {
      // Same key extraction as jiraIssuesFromTasks — one task carries one key.
      const jiraKey = display(t.correlation_display).trim()
      rows.push({
        sysId: value(t.sys_id),
        changeSysId,
        number: display(t.number) || EMPTY,
        description: display(t.short_description) || 'Untitled task',
        state: t.state,
        stateText: display(t.state) || 'Unknown',
        changeNumber,
        start: formatDateTime(parseSnDate(value(t.planned_start_date)), zone),
        end: formatDateTime(parseSnDate(value(t.planned_end_date)), zone),
        assignee: display(t.assigned_to) || EMPTY,
        assigneeId: value(t.assigned_to),
        jiraKey,
        jiraText: jiraKey || EMPTY,
      })
    }
  }
  return rows
}

/**
 * Fold task_ci rows into one row per DISTINCT CI. The "Used by" column is the
 * point of the tab: a CI carrying two or more changes is a weekend collision —
 * a fact about the window that is invisible from inside either change — so
 * rows sort most-contended first.
 */
function buildCiRows(cis: AffectedCiRecord[], changes: ChangeRecord[]): CiRow[] {
  const changeById = new Map(changes.map((c) => [value(c.sys_id), c]))
  const byCi = new Map<string, CiRow>()
  for (const ci of cis) {
    const changeSysId = value(ci.task)
    const change = changeById.get(changeSysId)
    if (!change) continue // its change is filtered out of view
    const ciId = value(ci.ci_item)
    if (!ciId) continue
    let row = byCi.get(ciId)
    if (!row) {
      row = {
        ciId,
        name: display(ci.ci_item) || 'Unknown CI',
        ciClass: display(ci['ci_item.sys_class_name']) || EMPTY,
        status: display(ci['ci_item.operational_status']) || EMPTY,
        changes: [],
        changeText: '',
      }
      byCi.set(ciId, row)
    }
    if (!row.changes.some((x) => x.sysId === changeSysId)) {
      row.changes.push({ sysId: changeSysId, number: display(change.number) || EMPTY })
    }
  }
  const rows = [...byCi.values()]
  for (const row of rows) row.changeText = row.changes.map((x) => x.number).join(', ')
  rows.sort((a, b) => b.changes.length - a.changes.length || a.name.localeCompare(b.name))
  return rows
}

/**
 * Fold the visible tasks' Jira keys into one row per DISTINCT key — the same
 * extraction as jiraIssuesFromTasks, but carrying the parent changes too, and
 * decorated with whatever the batch summary lookup resolved. Sorted by key for
 * a stable reading order; an unresolved key keeps its row (see JiraRow).
 */
function buildJiraRows(
  changes: ChangeRecord[],
  tasksByChange: Map<string, TaskRecord[]>,
  summaries: Map<string, JiraIssueSummary>,
): JiraRow[] {
  interface KeyAcc {
    tasks: { sysId: string; changeSysId: string; number: string }[]
    changes: { sysId: string; number: string }[]
  }
  const byKey = new Map<string, KeyAcc>()
  for (const c of changes) {
    const changeSysId = value(c.sys_id)
    const changeNumber = display(c.number) || EMPTY
    for (const t of tasksByChange.get(changeSysId) ?? []) {
      const key = display(t.correlation_display).trim()
      if (!key) continue
      let acc = byKey.get(key)
      if (!acc) {
        acc = { tasks: [], changes: [] }
        byKey.set(key, acc)
      }
      acc.tasks.push({
        sysId: value(t.sys_id),
        changeSysId,
        number: display(t.number) || EMPTY,
      })
      if (!acc.changes.some((x) => x.sysId === changeSysId)) {
        acc.changes.push({ sysId: changeSysId, number: changeNumber })
      }
    }
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, acc]) => {
      const resolved = summaries.get(key)
      return {
        key,
        summary: resolved?.summary || EMPTY,
        statusText: resolved?.status || EMPTY,
        resolved,
        assignee: resolved?.assignee || EMPTY,
        tasks: acc.tasks,
        taskText: acc.tasks.map((t) => t.number).join(', ') || EMPTY,
        changes: acc.changes,
        changeText: acc.changes.map((x) => x.number).join(', ') || EMPTY,
      }
    })
}

function buildPersonRows(
  changes: ChangeRecord[],
  tasksByChange: Map<string, TaskRecord[]>,
): PersonRow[] {
  interface PersonAcc {
    id: string
    name: string
    changes: { sysId: string; number: string }[]
    tasks: { sysId: string; changeSysId: string; number: string }[]
    groups: Set<string>
  }
  const acc = new Map<string, PersonAcc>()
  const personFor = (field: SnField): PersonAcc | null => {
    const id = value(field)
    const name = display(field).trim()
    if (!id || !name) return null
    let p = acc.get(id)
    if (!p) {
      p = { id, name, changes: [], tasks: [], groups: new Set() }
      acc.set(id, p)
    }
    return p
  }
  for (const c of changes) {
    const changeSysId = value(c.sys_id)
    const changeNumber = display(c.number) || EMPTY
    const group = display(c.assignment_group).trim()
    const owner = personFor(c.assigned_to)
    if (owner) {
      owner.changes.push({ sysId: changeSysId, number: changeNumber })
      if (group) owner.groups.add(group)
    }
    for (const t of tasksByChange.get(changeSysId) ?? []) {
      const worker = personFor(t.assigned_to)
      if (!worker) continue
      worker.tasks.push({
        sysId: value(t.sys_id),
        changeSysId,
        number: display(t.number) || EMPTY,
      })
      // Groups = who they're working UNDER this weekend. A task has no group of
      // its own in this payload, so the parent change's group stands in.
      if (group) worker.groups.add(group)
    }
  }
  return [...acc.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      changes: p.changes,
      changeText: p.changes.map((c) => c.number).join(', ') || EMPTY,
      tasks: p.tasks,
      taskText: p.tasks.map((t) => t.number).join(', ') || EMPTY,
      groupText: [...p.groups].sort((a, b) => a.localeCompare(b)).join(', ') || EMPTY,
    }))
}

// ---------------------------------------------------------------------------
// Shared cell pieces
// ---------------------------------------------------------------------------

/** A change task as a clickable cream pill — hover deepens one ladder step. */
function TaskPill({
  number,
  title,
  onOpen,
}: {
  number: string
  title: string
  onOpen: () => void
}) {
  return (
    <button type="button" title={title} onClick={onOpen} className={cn('group rounded-full', FOCUS_RING)}>
      <Badge
        variant="pill"
        size="sm"
        className="tabular-nums group-hover:bg-surface-cream-strong"
      >
        {number}
      </Badge>
    </button>
  )
}

/** Change numbers as inline record links, wrapping. */
function ChangeLinkList({
  changes,
  onOpen,
}: {
  changes: { sysId: string; number: string }[]
  onOpen: (sysId: string) => void
}) {
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {changes.map((c) => (
        <RecordLink key={c.sysId} title={`Open ${c.number}`} onClick={() => onOpen(c.sysId)}>
          {c.number}
        </RecordLink>
      ))}
    </span>
  )
}

const changeCol = createColumnHelper<ChangeRow>()
const taskCol = createColumnHelper<TaskRow>()
const ciCol = createColumnHelper<CiRow>()
const jiraCol = createColumnHelper<JiraRow>()
const personCol = createColumnHelper<PersonRow>()

/**
 * Grid view: the visible weekend as one full-width spreadsheet-style table,
 * built for reading and COPYING the register (DataGrid owns the machinery).
 * Its TOP-LEVEL tabs are record types: change requests (optionally grouped by
 * region), their change tasks, the CIs they touch, the Jiras their tasks name,
 * and the people they're assigned to. All five are projections of the same
 * population — the toolbar's group/assignee filters decide WHICH changes are
 * in view, the tabs decide what to read off them. The STATE filter is the one
 * scope that is NOT top-level: state is a fact about change requests, so its
 * tabs live inside that projection and touch nothing else.
 */
export function GridView({
  changes,
  tasksByChange,
  cis,
  jiraService,
  stateTabs,
  stateFilter,
  onStateFilter,
  controls,
  onOpenChange,
  onOpenJira,
  onOpenPerson,
  onOpenTask,
}: {
  /** Already scoped by the toolbar's group/assignee filters — NOT by state. */
  changes: ChangeRecord[]
  tasksByChange: Map<string, TaskRecord[]>
  /** WINDOW-wide task_ci rows (useWeekendCis); filtered to `changes` here. */
  cis: AffectedCiRecord[]
  /** Resolves the Jiras tab's keys via the batch summaries route (cached). */
  jiraService: JiraService
  /** Distinct states in the active phase — the app owns the option list and
      the selection, so the filter survives a flip to List view unchanged. */
  stateTabs: { value: string; label: string }[]
  stateFilter: string
  onStateFilter: (value: string) => void
  /** The app toolbar's right-hand cluster (group/assignee selects, view
      toggle), rendered into the grid's own top row beside the type tabs. */
  controls?: ReactNode
  onOpenChange: (sysId: string) => void
  onOpenJira: (key: string) => void
  onOpenPerson: (personSysId: string) => void
  onOpenTask: (taskSysId: string, changeSysId: string) => void
}) {
  const zone = useTimeZone()
  const [tab, setTab] = useState<GridTab>('changes')
  const [changeGrouping, setChangeGrouping] = useState<ChangeGrouping>('none')

  // The state filter scopes the Change requests projection ONLY — see GridTab.
  const stateFilteredChanges = useMemo(
    () =>
      stateFilter === 'all'
        ? changes
        : changes.filter((c) => value(c.state) === stateFilter),
    [changes, stateFilter],
  )

  // All five projections are built even though one renders: the tab triggers
  // carry live counts, and the builders are cheap (hundreds of rows, in memory).
  const changeRows = useMemo(
    () => buildChangeRows(stateFilteredChanges, tasksByChange, zone),
    [stateFilteredChanges, tasksByChange, zone],
  )
  const taskRows = useMemo(
    () => buildTaskRows(changes, tasksByChange, zone),
    [changes, tasksByChange, zone],
  )
  const ciRows = useMemo(() => buildCiRows(cis, changes), [cis, changes])
  // The Jiras projection resolves its keys through the same batch route the
  // detail pane's Jiras tab uses; the service caches, so revisits are free.
  const jiraKeys = useMemo(() => {
    const keys: string[] = []
    for (const c of changes) {
      for (const t of tasksByChange.get(value(c.sys_id)) ?? []) {
        const key = display(t.correlation_display).trim()
        if (key) keys.push(key)
      }
    }
    return keys
  }, [changes, tasksByChange])
  const summaries = useJiraSummaries(jiraService, jiraKeys)
  const jiraRows = useMemo(
    () => buildJiraRows(changes, tasksByChange, summaries),
    [changes, tasksByChange, summaries],
  )
  const personRows = useMemo(
    () => buildPersonRows(changes, tasksByChange),
    [changes, tasksByChange],
  )

  // Grouping is presentation: rows re-sort into contiguous regions (DataGrid's
  // grouping contract) only while the option is on. Off = the service's own
  // ordering, exactly as the flat spreadsheet always read. The sort is stable,
  // so that ordering also survives within each region; labels outside
  // REGION_ORDER (possible once the real rule lands) sort after it, A→Z.
  const groupedChangeRows = useMemo(() => {
    if (changeGrouping !== 'region') return changeRows
    return [...changeRows].sort(
      (a, b) => regionRank(a.region) - regionRank(b.region) || a.region.localeCompare(b.region),
    )
  }, [changeRows, changeGrouping])

  const changeColumns = useMemo(
    () => [
      changeCol.accessor('number', {
        header: 'Number',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
        cell: (info) => (
          <RecordLink
            title={`Open ${info.getValue()}`}
            onClick={() => onOpenChange(info.row.original.sysId)}
          >
            {info.getValue()}
          </RecordLink>
        ),
      }),
      changeCol.accessor('description', {
        header: 'Short description',
        meta: { cellClassName: 'min-w-64 text-ink' },
      }),
      changeCol.accessor('start', {
        header: 'Planned start',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
      }),
      changeCol.accessor('end', {
        header: 'Planned end',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
      }),
      changeCol.accessor('assignee', {
        header: 'Assigned to',
        meta: { cellClassName: 'min-w-40' },
        cell: (info) => {
          const { assigneeId } = info.row.original
          if (!assigneeId) return EMPTY
          return (
            <PersonBadge
              name={info.getValue()}
              size="sm"
              onOpen={() => onOpenPerson(assigneeId)}
            />
          )
        },
      }),
      changeCol.accessor('taskText', {
        header: 'Change tasks',
        meta: { cellClassName: 'min-w-48' },
        cell: (info) => {
          const { tasks, sysId } = info.row.original
          if (tasks.length === 0) return EMPTY
          return (
            <span className="flex flex-wrap gap-1">
              {tasks.map((t) => (
                <TaskPill
                  key={value(t.sys_id)}
                  number={display(t.number)}
                  title={`Open ${display(t.number)} · ${display(t.state) || 'Unknown'}`}
                  onOpen={() => onOpenTask(value(t.sys_id), sysId)}
                />
              ))}
            </span>
          )
        },
      }),
      changeCol.accessor('jiraText', {
        header: 'Jiras',
        meta: { cellClassName: 'min-w-40' },
        cell: (info) => {
          const { jiraKeys } = info.row.original
          if (jiraKeys.length === 0) return EMPTY
          return (
            <span className="flex flex-wrap gap-1">
              {jiraKeys.map((k) => (
                <JiraLink key={k} issueKey={k} onOpen={onOpenJira} />
              ))}
            </span>
          )
        },
      }),
      changeCol.accessor('everyone', {
        header: 'Everyone assigned',
        meta: { cellClassName: 'min-w-48' },
        cell: (info) => {
          const { people } = info.row.original
          if (people.length === 0) return EMPTY
          return (
            <span className="flex flex-wrap gap-1">
              {people.map((p) => (
                <PersonBadge key={p.id} name={p.name} size="sm" onOpen={() => onOpenPerson(p.id)} />
              ))}
            </span>
          )
        },
      }),
    ],
    [onOpenChange, onOpenJira, onOpenPerson, onOpenTask],
  )

  const taskColumns = useMemo(
    () => [
      taskCol.accessor('number', {
        header: 'Number',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
        cell: (info) => (
          <RecordLink
            title={`Open ${info.getValue()}`}
            onClick={() =>
              onOpenTask(info.row.original.sysId, info.row.original.changeSysId)
            }
          >
            {info.getValue()}
          </RecordLink>
        ),
      }),
      taskCol.accessor('description', {
        header: 'Short description',
        meta: { cellClassName: 'min-w-64 text-ink' },
      }),
      taskCol.accessor('stateText', {
        header: 'State',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: (info) => <TaskStateBadge state={info.row.original.state} size="sm" />,
      }),
      taskCol.accessor('changeNumber', {
        header: 'Change',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
        cell: (info) => (
          <RecordLink
            title={`Open ${info.getValue()}`}
            onClick={() => onOpenChange(info.row.original.changeSysId)}
          >
            {info.getValue()}
          </RecordLink>
        ),
      }),
      taskCol.accessor('start', {
        header: 'Planned start',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
      }),
      taskCol.accessor('end', {
        header: 'Planned end',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
      }),
      taskCol.accessor('assignee', {
        header: 'Assigned to',
        meta: { cellClassName: 'min-w-40' },
        cell: (info) => {
          const { assigneeId } = info.row.original
          if (!assigneeId) return EMPTY
          return (
            <PersonBadge
              name={info.getValue()}
              size="sm"
              onOpen={() => onOpenPerson(assigneeId)}
            />
          )
        },
      }),
      taskCol.accessor('jiraText', {
        header: 'Jira',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: (info) => {
          const { jiraKey } = info.row.original
          if (!jiraKey) return EMPTY
          return <JiraLink issueKey={jiraKey} onOpen={onOpenJira} />
        },
      }),
    ],
    [onOpenChange, onOpenJira, onOpenPerson, onOpenTask],
  )

  const ciColumns = useMemo(
    () => [
      ciCol.accessor('name', {
        header: 'CI',
        meta: { cellClassName: 'min-w-48 font-medium text-ink' },
      }),
      ciCol.accessor('ciClass', {
        header: 'Class',
        meta: { cellClassName: 'min-w-40' },
      }),
      ciCol.accessor('status', {
        header: 'Operational status',
        meta: { cellClassName: 'whitespace-nowrap' },
      }),
      ciCol.accessor('changeText', {
        header: 'Used by',
        meta: { cellClassName: 'min-w-48 tabular-nums' },
        cell: (info) => (
          <ChangeLinkList changes={info.row.original.changes} onOpen={onOpenChange} />
        ),
      }),
    ],
    [onOpenChange],
  )

  const jiraColumns = useMemo(
    () => [
      jiraCol.accessor('key', {
        header: 'Key',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: (info) => <JiraLink issueKey={info.getValue()} onOpen={onOpenJira} />,
      }),
      jiraCol.accessor('summary', {
        header: 'Summary',
        meta: { cellClassName: 'min-w-64 text-ink' },
      }),
      jiraCol.accessor('statusText', {
        header: 'Status',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: (info) => {
          const { resolved } = info.row.original
          // No summary = the lookup failed or the key isn't in Jira; the key
          // column still opens the issue page, which says which.
          if (!resolved) return EMPTY
          return (
            <JiraStatusBadge status={resolved.status} category={resolved.statusCategory} />
          )
        },
      }),
      // A Jira assignee is a name Jira holds, not a sys_user — so it reads as
      // plain text, never a PersonBadge (there is no person page to open).
      jiraCol.accessor('assignee', {
        header: 'Assignee',
        meta: { cellClassName: 'min-w-40' },
      }),
      jiraCol.accessor('taskText', {
        header: 'Change tasks',
        meta: { cellClassName: 'min-w-48' },
        cell: (info) => {
          const { tasks } = info.row.original
          if (tasks.length === 0) return EMPTY
          return (
            <span className="flex flex-wrap gap-1">
              {tasks.map((t) => (
                <TaskPill
                  key={t.sysId}
                  number={t.number}
                  title={`Open ${t.number}`}
                  onOpen={() => onOpenTask(t.sysId, t.changeSysId)}
                />
              ))}
            </span>
          )
        },
      }),
      jiraCol.accessor('changeText', {
        header: 'Changes',
        meta: { cellClassName: 'min-w-40 tabular-nums' },
        cell: (info) => (
          <ChangeLinkList changes={info.row.original.changes} onOpen={onOpenChange} />
        ),
      }),
    ],
    [onOpenChange, onOpenJira, onOpenTask],
  )

  const personColumns = useMemo(
    () => [
      personCol.accessor('name', {
        header: 'Person',
        meta: { cellClassName: 'min-w-40 whitespace-nowrap' },
        cell: (info) => (
          <PersonBadge
            name={info.getValue()}
            size="sm"
            onOpen={() => onOpenPerson(info.row.original.id)}
          />
        ),
      }),
      personCol.accessor('changeText', {
        header: 'Changes',
        meta: { cellClassName: 'min-w-40 tabular-nums' },
        cell: (info) => {
          const { changes: assigned } = info.row.original
          if (assigned.length === 0) return EMPTY
          return <ChangeLinkList changes={assigned} onOpen={onOpenChange} />
        },
      }),
      personCol.accessor('taskText', {
        header: 'Change tasks',
        meta: { cellClassName: 'min-w-48' },
        cell: (info) => {
          const { tasks } = info.row.original
          if (tasks.length === 0) return EMPTY
          return (
            <span className="flex flex-wrap gap-1">
              {tasks.map((t) => (
                <TaskPill
                  key={t.sysId}
                  number={t.number}
                  title={`Open ${t.number}`}
                  onOpen={() => onOpenTask(t.sysId, t.changeSysId)}
                />
              ))}
            </span>
          )
        },
      }),
      personCol.accessor('groupText', {
        header: 'Groups',
        meta: { cellClassName: 'min-w-48' },
      }),
    ],
    [onOpenChange, onOpenPerson, onOpenTask],
  )

  // Same count idiom as the detail pane's tabs: the count leads the label and
  // recedes by WEIGHT (font-normal against the trigger's 500), not by a lighter
  // ink — muted-foreground is already the inactive trigger's text color.
  const tabBar = (
    <Tabs value={tab} onValueChange={(next) => setTab(next as GridTab)}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="changes" className="gap-1.5">
          <span className="font-normal text-muted-foreground">{changeRows.length}</span>
          {changeRows.length === 1 ? 'Change request' : 'Change requests'}
        </TabsTrigger>
        <TabsTrigger value="tasks" className="gap-1.5">
          <span className="font-normal text-muted-foreground">{taskRows.length}</span>
          {taskRows.length === 1 ? 'Change task' : 'Change tasks'}
        </TabsTrigger>
        <TabsTrigger value="cis" className="gap-1.5">
          <span className="font-normal text-muted-foreground">{ciRows.length}</span>
          {ciRows.length === 1 ? 'Affected CI' : 'Affected CIs'}
        </TabsTrigger>
        <TabsTrigger value="jiras" className="gap-1.5">
          <span className="font-normal text-muted-foreground">{jiraRows.length}</span>
          {jiraRows.length === 1 ? 'Jira' : 'Jiras'}
        </TabsTrigger>
        <TabsTrigger value="people" className="gap-1.5">
          <span className="font-normal text-muted-foreground">{personRows.length}</span>
          {personRows.length === 1 ? 'Person' : 'People'}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )

  // The state filter, relocated from the app toolbar: it scopes THIS projection
  // only, so it sits inside it — same Tabs idiom, one level down from the type
  // tabs that own the surface.
  const stateTabBar = stateTabs.length > 0 && (
    <Tabs value={stateFilter} onValueChange={onStateFilter}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="all">All</TabsTrigger>
        {stateTabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  // Grouping is a display OPTION for the changes tab only (same Select idiom as
  // the toolbar's filters) — it describes how the projection is arranged, not
  // what's in it, so it rides beside the state tabs that decide what's in it.
  const changesLeading = (
    <>
      {stateTabBar}
      <Select
        value={changeGrouping}
        onValueChange={(next) => setChangeGrouping(next as ChangeGrouping)}
      >
        <SelectTrigger aria-label="Row grouping" className="h-8 w-40 text-caption">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No grouping</SelectItem>
          <SelectItem value="region">Group by region</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  // The top row's group/assignee filters scope by CHANGES even on these
  // projections — a task, CI, Jira or person is here because its change is in
  // view. Say so beside the projection's name, or those filters read as broken
  // on the tabs they don't directly describe. (The state filter no longer
  // applies here at all — it belongs to the Change requests tab.)
  const projectionLeading = (
    <p className="text-caption text-muted-foreground">
      of {changes.length} {changes.length === 1 ? 'change' : 'changes'} in view
    </p>
  )

  const grid =
    tab === 'tasks' ? (
      <DataGrid
        rows={taskRows}
        columns={taskColumns}
        rowKey={(r) => r.sysId}
        label="Weekend change tasks"
        nounOne="task"
        nounMany="tasks"
        emptyTitle="No change tasks in view"
        emptyBody="The changes in view carry no change tasks."
        leading={projectionLeading}
      />
    ) : tab === 'cis' ? (
      <DataGrid
        rows={ciRows}
        columns={ciColumns}
        rowKey={(r) => r.ciId}
        label="Weekend affected CIs"
        nounOne="CI"
        nounMany="CIs"
        emptyTitle="No affected CIs in view"
        emptyBody="No CIs are recorded against the changes in view."
        leading={projectionLeading}
      />
    ) : tab === 'jiras' ? (
      <DataGrid
        rows={jiraRows}
        columns={jiraColumns}
        rowKey={(r) => r.key}
        label="Weekend Jiras"
        nounOne="Jira"
        nounMany="Jiras"
        emptyTitle="No Jiras in view"
        emptyBody="No Jira keys are on the change tasks in view."
        leading={projectionLeading}
      />
    ) : tab === 'people' ? (
      <DataGrid
        rows={personRows}
        columns={personColumns}
        rowKey={(r) => r.id}
        label="Weekend people"
        nounOne="person"
        nounMany="people"
        emptyTitle="No people in view"
        emptyBody="Nothing in view is assigned to anyone."
        leading={projectionLeading}
      />
    ) : (
      <DataGrid
        rows={groupedChangeRows}
        columns={changeColumns}
        rowKey={(r) => r.sysId}
        label="Weekend changes"
        nounOne="change"
        nounMany="changes"
        emptyTitle="No changes in view"
        emptyBody="No changes match the current filters in this window."
        groupOf={changeGrouping === 'region' ? (r) => r.region : undefined}
        groupHeaderLabel="Region"
        leading={changesLeading}
      />
    )

  // The ARRIVAL animation fires once, for the grid surface as a block. The top
  // row is the surface's own toolbar: the type tabs are its primary nav, and
  // the app's filter cluster (group/assignee, view toggle) rides at its right
  // end — same row, same rank, because both scope every projection. A tab
  // switch is a lateral move between siblings, so the keyed inner wrapper
  // remounts and crossfades (ui/tabs doctrine: "crossfade, not rise") — and the
  // remount also hands each projection a fresh selection/status slate.
  return (
    <div className="flex min-h-0 flex-1 animate-rise-in flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {tabBar}
        {controls}
      </div>
      <div key={tab} className="flex min-h-0 flex-1 animate-fade-in flex-col">
        {grid}
      </div>
    </div>
  )
}
