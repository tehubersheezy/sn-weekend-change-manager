import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowData,
} from '@tanstack/react-table'
import { Copy } from 'lucide-react'
import type { ChangeRecord, TaskRecord } from '../types'
import { cn, FOCUS_RING } from '../lib/utils'
import { display, value, type SnField } from '../utils/fields'
import { formatDateTime, parseSnDate } from '../utils/datetime'
import { jiraIssuesFromTasks } from './JiraList'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { CenteredState } from './ChangeList'
import { JiraLink, RecordLink } from './InlineLink'
import { PersonBadge } from './PersonBadge'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- shape fixed by the library
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Extra classes for this column's body cells. */
    cellClassName?: string
  }
}

/**
 * One change flattened for the grid. Every string field is BOTH the rendered
 * text and the clipboard text — the copy feature promises "what you see is what
 * you paste", so the two are never computed separately. Columns whose cells
 * render richer JSX (task pills, Jira chips) keep their plain-text twin
 * (taskText / jiraText) as the column accessor, which is what getValue() — and
 * therefore the copy matrix — reads.
 */
interface GridRow {
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
}

const EMPTY = '—'

function buildRows(
  changes: ChangeRecord[],
  tasksByChange: Map<string, TaskRecord[]>,
): GridRow[] {
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
      start: formatDateTime(parseSnDate(value(c.start_date))),
      end: formatDateTime(parseSnDate(value(c.end_date))),
      assignee: display(c.assigned_to) || EMPTY,
      assigneeId: value(c.assigned_to),
      tasks,
      taskText: tasks.map((t) => display(t.number)).filter(Boolean).join(', ') || EMPTY,
      jiraKeys,
      jiraText: jiraKeys.join(', ') || EMPTY,
      people,
      everyone: people.map((p) => p.name).join(', ') || EMPTY,
    }
  })
}

/** Tabs/newlines inside a cell would corrupt the TSV shape; flatten them. */
function tsvCell(text: string): string {
  return text.replace(/[\t\r\n]+/g, ' ').trim()
}

function toTsv(rows: string[][]): string {
  return rows.map((r) => r.map(tsvCell).join('\t')).join('\n')
}

/**
 * navigator.clipboard needs a secure context and (inside the Polaris iframe) a
 * permissive clipboard-write policy; the textarea + execCommand path is the
 * fallback when either is missing.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to execCommand */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

interface CellPos {
  r: number
  c: number
}

const col = createColumnHelper<GridRow>()

/**
 * Grid view: the whole visible change set as one full-width spreadsheet-style
 * table, built for getting data OUT of the console. Shift+drag paints a
 * rectangular cell selection (⌘C / Ctrl+C copies it as TSV — pasteable straight
 * into a sheet); the top-right button copies the entire table with headers.
 *
 * Native text selection is disabled inside the table on purpose: cell selection
 * replaces it, and two competing selection models fighting over the same drag
 * is worse than either alone. Plain clicks still navigate — a change number
 * opens the change, a task pill opens its change on the Change tasks tab, a
 * Jira chip opens the issue — and a click-capture guard keeps those quiet
 * during and immediately after a selection drag.
 */
export function ChangeGridView({
  changes,
  tasksByChange,
  onOpenChange,
  onOpenJira,
  onOpenPerson,
  onOpenTask,
}: {
  changes: ChangeRecord[]
  tasksByChange: Map<string, TaskRecord[]>
  onOpenChange: (sysId: string) => void
  onOpenJira: (key: string) => void
  onOpenPerson: (personSysId: string) => void
  onOpenTask: (taskSysId: string, changeSysId: string) => void
}) {
  const rows = useMemo(() => buildRows(changes, tasksByChange), [changes, tasksByChange])

  const columns = useMemo(
    () => [
      col.accessor('number', {
        header: 'Number',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: (info) => (
          <RecordLink
            title={`Open ${info.getValue()}`}
            onClick={() => onOpenChange(info.row.original.sysId)}
          >
            {info.getValue()}
          </RecordLink>
        ),
      }),
      col.accessor('description', {
        header: 'Short description',
        meta: { cellClassName: 'min-w-64 text-ink' },
      }),
      col.accessor('start', {
        header: 'Planned start',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
      }),
      col.accessor('end', {
        header: 'Planned end',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
      }),
      col.accessor('assignee', {
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
      col.accessor('taskText', {
        header: 'Change tasks',
        meta: { cellClassName: 'min-w-48' },
        cell: (info) => {
          const { tasks, sysId } = info.row.original
          if (tasks.length === 0) return EMPTY
          return (
            <span className="flex flex-wrap gap-1">
              {tasks.map((t) => (
                <button
                  key={value(t.sys_id)}
                  type="button"
                  title={`Open ${display(t.number)} · ${display(t.state) || 'Unknown'}`}
                  onClick={() => onOpenTask(value(t.sys_id), sysId)}
                  className={cn('rounded-full', FOCUS_RING)}
                >
                  <Badge variant="pill" size="sm" className="tabular-nums">
                    {display(t.number)}
                  </Badge>
                </button>
              ))}
            </span>
          )
        },
      }),
      col.accessor('jiraText', {
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
      col.accessor('everyone', {
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

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })
  const rowModel = table.getRowModel().rows

  // The copy matrix reads getValue() per visible cell, so the column list above
  // is the single source of truth for order, headers, cell JSX AND copy text.
  const headerTexts = useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((c) => (typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id)),
    [table],
  )
  const matrix = useMemo(
    () => rowModel.map((row) => row.getVisibleCells().map((cell) => String(cell.getValue() ?? ''))),
    [rowModel],
  )

  // --- shift+drag rectangular selection -----------------------------------
  const [range, setRange] = useState<{ anchor: CellPos; focus: CellPos } | null>(null)
  const draggingRef = useRef(false)
  // A drag's mouseup is followed by a click on whatever cell it ended over;
  // without this, finishing a selection on top of a link would navigate.
  const suppressClickRef = useRef(false)

  const rect = useMemo(() => {
    if (!range || matrix.length === 0) return null
    const clamp = (n: number, hi: number) => Math.max(0, Math.min(n, hi))
    const maxR = matrix.length - 1
    const maxC = (matrix[0]?.length ?? 1) - 1
    return {
      r1: clamp(Math.min(range.anchor.r, range.focus.r), maxR),
      r2: clamp(Math.max(range.anchor.r, range.focus.r), maxR),
      c1: clamp(Math.min(range.anchor.c, range.focus.c), maxC),
      c2: clamp(Math.max(range.anchor.c, range.focus.c), maxC),
    }
  }, [range, matrix])

  // Row/col indexes are only meaningful against the row set they were made on;
  // when filters or the window change the population, drop the selection.
  const rowsKey = useMemo(() => rows.map((r) => r.sysId).join('|'), [rows])
  useEffect(() => setRange(null), [rowsKey])

  const cellFromEvent = (e: React.MouseEvent): CellPos | null => {
    const td = (e.target as HTMLElement).closest('td[data-r]')
    if (!(td instanceof HTMLTableCellElement)) return null
    return { r: Number(td.dataset.r), c: Number(td.dataset.c) }
  }

  const onCellMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const cell = cellFromEvent(e)
    if (!cell) return
    if (e.shiftKey) {
      // preventDefault stops the browser starting its own text selection under
      // the drag (and stops the mousedown stealing focus from the grid).
      e.preventDefault()
      draggingRef.current = true
      setRange({ anchor: cell, focus: cell })
    } else if (range) {
      setRange(null)
    }
  }

  const onCellMouseOver = (e: React.MouseEvent) => {
    if (!draggingRef.current) return
    const cell = cellFromEvent(e)
    if (!cell) return
    setRange((prev) =>
      prev && (prev.focus.r !== cell.r || prev.focus.c !== cell.c)
        ? { ...prev, focus: cell }
        : prev,
    )
  }

  const onBodyClickCapture = (e: React.MouseEvent) => {
    if (e.shiftKey || suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  useEffect(() => {
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      suppressClickRef.current = true
      // The click event fires synchronously after mouseup; clear on next tick.
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  // --- clipboard ------------------------------------------------------------
  const [status, setStatus] = useState<string | null>(null)
  const statusTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(statusTimer.current), [])

  const flash = useCallback((message: string) => {
    window.clearTimeout(statusTimer.current)
    setStatus(message)
    statusTimer.current = window.setTimeout(() => setStatus(null), 2500)
  }, [])

  const copySelection = useCallback(async () => {
    if (!rect) return
    const slice = matrix
      .slice(rect.r1, rect.r2 + 1)
      .map((row) => row.slice(rect.c1, rect.c2 + 1))
    const count = slice.length * (slice[0]?.length ?? 0)
    const ok = await writeClipboard(toTsv(slice))
    flash(ok ? `Copied ${count} cell${count === 1 ? '' : 's'}` : 'Copy failed')
  }, [rect, matrix, flash])

  const copyTable = useCallback(async () => {
    const ok = await writeClipboard(toTsv([headerTexts, ...matrix]))
    flash(
      ok
        ? `Copied table — ${matrix.length} row${matrix.length === 1 ? '' : 's'}`
        : 'Copy failed',
    )
  }, [headerTexts, matrix, flash])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRange(null)
        return
      }
      if (!(e.metaKey || e.ctrlKey) || (e.key !== 'c' && e.key !== 'C') || !rect) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return
      // A real text selection elsewhere on the page keeps native copy.
      const native = window.getSelection()
      if (native && !native.isCollapsed) return
      e.preventDefault()
      void copySelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, copySelection])

  // --- render ---------------------------------------------------------------
  const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || '')
  const copyKeyLabel = isMac ? '⌘C' : 'Ctrl+C'
  const hint = rect
    ? `${rect.r2 - rect.r1 + 1} × ${rect.c2 - rect.c1 + 1} cells selected · ${copyKeyLabel} copies`
    : `${rows.length} change${rows.length === 1 ? '' : 's'} · Shift+drag selects cells to copy`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-4">
        {/* Only the copy confirmation is a live region: the hint's cell count
            changes on every cell a drag crosses, and announcing each one would
            bury a screen reader in noise. */}
        <p className="text-caption text-muted-foreground">
          <span aria-live="polite">{status}</span>
          {!status && hint}
        </p>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Copy table"
          title="Copy table"
          disabled={rows.length === 0}
          onClick={() => void copyTable()}
        >
          <Copy />
        </Button>
      </div>

      {rows.length === 0 ? (
        <CenteredState title="No changes in view">
          <p className="max-w-md text-body-sm text-muted-foreground">
            No changes match the current filters in this window.
          </p>
        </CenteredState>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          {/* border-separate (not collapse) so the sticky header keeps its own
              bottom hairline — collapsed borders scroll away with the rows. */}
          <table
            aria-label="Weekend changes"
            className="w-full select-none border-separate border-spacing-0 font-sans"
          >
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-background px-3 py-2.5 text-left align-middle text-caption-upper font-medium uppercase text-muted-foreground"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              className="[&_tr:last-child_td]:border-b-0"
              onMouseDown={onCellMouseDown}
              onMouseOver={onCellMouseOver}
              onClickCapture={onBodyClickCapture}
            >
              {rowModel.map((row, r) => (
                <tr key={row.original.sysId}>
                  {row.getVisibleCells().map((cell, c) => (
                    <td
                      key={cell.id}
                      data-r={r}
                      data-c={c}
                      className={cn(
                        'border-b border-hairline-soft px-3 py-2 align-top text-body-sm text-body-text',
                        cell.column.columnDef.meta?.cellClassName,
                        rect &&
                          r >= rect.r1 &&
                          r <= rect.r2 &&
                          c >= rect.c1 &&
                          c <= rect.c2 &&
                          'bg-surface-cream-strong',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
