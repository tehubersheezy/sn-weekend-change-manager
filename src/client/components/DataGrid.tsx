import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { Copy } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { CenteredState } from './ChangeList'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- shape fixed by the library
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Extra classes for this column's body cells. */
    cellClassName?: string
  }
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

export interface DataGridProps<Row> {
  rows: Row[]
  /**
   * Column defs whose ACCESSORS all return the cell's plain text. The accessor
   * is what getValue() — and therefore the copy matrix — reads, so it is the
   * clipboard twin of whatever the cell renders: "what you see is what you
   * paste". A column whose cell renders richer JSX (pills, chips, badges)
   * carries its plain-text twin as the accessor and keeps the rich payload on
   * the row object.
   */
  columns: ColumnDef<Row, string>[]
  rowKey: (row: Row) => string
  /** Table aria-label, e.g. "Weekend change tasks". */
  label: string
  /** Hint/count nouns: "84 changes", "1 person". */
  nounOne: string
  nounMany: string
  emptyTitle: string
  emptyBody: string
  /**
   * Section grouping. Rows must arrive contiguously grouped (pre-sorted by
   * group); a full-width band row is painted wherever the value changes
   * between consecutive rows. Bands are presentation only — they carry no
   * data-r, so they are invisible to the selection matrix and to cell copy.
   */
  groupOf?: (row: Row) => string
  /**
   * Whole-table copy prepends the group as a leading TSV column under this
   * header, so a pasted sheet keeps what the bands show — a section header
   * has no cell of its own to be copied through.
   */
  groupHeaderLabel?: string
  /** Left end of the toolbar row — the caller's per-projection controls
      (state filter tabs, grouping select, or a scope note). */
  leading?: ReactNode
}

/**
 * The spreadsheet half of the grid view: one full-width table built for
 * getting data OUT of the console. Shift+drag paints a rectangular cell
 * selection (⌘C / Ctrl+C copies it as TSV — pasteable straight into a sheet);
 * the toolbar button copies the entire table with headers.
 *
 * Native text selection is disabled inside the table on purpose: cell selection
 * replaces it, and two competing selection models fighting over the same drag
 * is worse than either alone. Plain clicks still navigate (record links, pills
 * and chips inside cells), and a click-capture guard keeps those quiet during
 * and immediately after a selection drag.
 *
 * Generic over the row shape — the tabbed grid feeds it changes, tasks, CIs
 * and people; the machinery only ever touches accessor text and rowKey.
 */
export function DataGrid<Row>({
  rows,
  columns,
  rowKey,
  label,
  nounOne,
  nounMany,
  emptyTitle,
  emptyBody,
  groupOf,
  groupHeaderLabel,
  leading,
}: DataGridProps<Row>) {
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })
  const rowModel = table.getRowModel().rows

  // The copy matrix reads getValue() per visible cell, so the caller's column
  // list is the single source of truth for order, headers, cell JSX AND copy text.
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

  const groupCounts = useMemo(() => {
    if (!groupOf) return null
    const counts = new Map<string, number>()
    for (const r of rows) counts.set(groupOf(r), (counts.get(groupOf(r)) ?? 0) + 1)
    return counts
  }, [rows, groupOf])

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
  // when filters, the window, or the active grid tab change the population,
  // drop the selection.
  const rowsKey = useMemo(() => rows.map(rowKey).join('|'), [rows, rowKey])
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
    const header = groupOf ? [groupHeaderLabel ?? 'Group', ...headerTexts] : headerTexts
    const body = groupOf
      ? rowModel.map((row, i) => [groupOf(row.original), ...matrix[i]])
      : matrix
    const ok = await writeClipboard(toTsv([header, ...body]))
    flash(
      ok
        ? `Copied table — ${matrix.length} row${matrix.length === 1 ? '' : 's'}`
        : 'Copy failed',
    )
  }, [groupOf, groupHeaderLabel, headerTexts, rowModel, matrix, flash])

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
    : rows.length === 0
      ? `0 ${nounMany}`
      : `${rows.length} ${rows.length === 1 ? nounOne : nounMany} · Shift+drag selects cells to copy`

  /** The band that starts at flat row index r, or null if r continues a group. */
  const bandFor = (r: number): string | null => {
    if (!groupOf) return null
    const g = groupOf(rowModel[r].original)
    if (r > 0 && groupOf(rowModel[r - 1].original) === g) return null
    return g
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {leading}
        <div className="ml-auto flex items-center gap-3">
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
      </div>

      {rows.length === 0 ? (
        <CenteredState title={emptyTitle}>
          <p className="max-w-md text-body-sm text-muted-foreground">{emptyBody}</p>
        </CenteredState>
      ) : (
        // No entrance animation here: the ARRIVAL rise-in lives on GridView's
        // mount wrapper (the grid enters as one block), and a tab switch is a
        // lateral move that crossfades out there — this container re-rendering
        // must not re-announce itself. Rows are NOT clickable (only the links
        // and pills inside cells are), so they take no hover wash either: a
        // row wash would fight the shift+drag selection paint.
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          {/* border-separate (not collapse) so the sticky header keeps its own
              bottom hairline — collapsed borders scroll away with the rows. */}
          <table
            aria-label={label}
            className="w-full select-none border-separate border-spacing-0 font-sans"
          >
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      scope="col"
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
              // Keyboard focus entering the grid dissolves the marquee: the
              // selection is mouse-made and transient (click and Escape already
              // clear it), and the focus ring measures 2.50:1 over a selection
              // fill — dissolving restores every focusable to a passing surface.
              onFocus={() => setRange(null)}
            >
              {rowModel.map((row, r) => {
                const band = bandFor(r)
                return (
                  <Fragment key={rowKey(row.original)}>
                    {band !== null && (
                      // Section band: presentation only. No data-r, so it can't
                      // anchor or extend a cell selection; whole-table copy
                      // carries its value as the leading group column instead.
                      // Its chrome is PASSIVE: surface-soft (the section-divider
                      // tone) with a muted label — the house GroupLabel idiom;
                      // surface-card would claim selected/active. The count drops
                      // caption-upper's wide tracking: tracking ships with the
                      // uppercase intent, and the count is lowercase.
                      <tr>
                        <td
                          colSpan={headerTexts.length}
                          className="border-b border-border bg-surface-soft px-3 py-2 text-caption-upper font-medium text-muted-foreground"
                        >
                          <span className="uppercase">{band}</span>
                          <span className="ml-2 text-caption font-normal tracking-normal">
                            {groupCounts?.get(band) ?? 0}{' '}
                            {(groupCounts?.get(band) ?? 0) === 1 ? nounOne : nounMany}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr>
                      {row.getVisibleCells().map((cell, c) => (
                        <td
                          key={cell.id}
                          data-r={r}
                          data-c={c}
                          className={cn(
                            'border-b border-hairline-soft px-3 py-2 align-top text-body-sm text-body-text',
                            cell.column.columnDef.meta?.cellClassName,
                            // surface-card is the app's ONE selection tone
                            // (selected list rows, timeline rows) — and the
                            // only fill where every status pill's -ink label
                            // is validated. cream-strong here failed both.
                            rect &&
                              r >= rect.r1 &&
                              r <= rect.r2 &&
                              c >= rect.c1 &&
                              c <= rect.c2 &&
                              'bg-surface-card',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
