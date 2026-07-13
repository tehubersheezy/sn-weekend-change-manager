import { useMemo, useRef, useState } from 'react'
import type { ChangeRecord } from '../types'
import type { WeekendWindow } from '../utils/weekendWindow'
import { display, value } from '../utils/fields'
import { formatDayTime, parseSnDate } from '../utils/datetime'
import { useTimeZone } from '../context/TimeZone'
import { cn, FOCUS_RING } from '../lib/utils'
import { CenteredState } from './ChangeList'

/**
 * Status colors for timeline bars — validated with the dataviz palette checker
 * against the cream canvas (#faf9f5): lightness band, chroma floor, CVD
 * separation, and ≥3:1 contrast all pass. Deeper steps of the DESIGN.md
 * semantic families; identity is never color-alone (each bar has a label row
 * and tooltip).
 */
const STATE_COLORS: Record<string, string> = {
  '-4': '#b8811f', // Assess — golden amber
  '-3': '#8a4030', // Authorize — deep rust
  '-2': '#0f8a70', // Scheduled — deep teal
  '-1': '#c26543', // Implement — coral, deepened for contrast
  '0': '#a1720a', // Review — dark amber
  '3': '#2f8f42', // Closed — green
}
const FALLBACK_COLOR = '#6c6a64'

const HOUR = 3_600_000

interface Tip {
  change: ChangeRecord
  x: number
  y: number
}

/** Gantt-style schedule: one row per change, bars spanning start→end over the window. */
export function TimelineView({
  changes,
  window: win,
  selectedId,
  onOpen,
}: {
  changes: ChangeRecord[]
  window: WeekendWindow
  selectedId: string | null
  onOpen: (sysId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const zone = useTimeZone()

  const ws = win.startLocal.getTime()
  const we = win.endLocal.getTime()
  const span = we - ws
  const pct = (t: number) => ((Math.min(Math.max(t, ws), we) - ws) / span) * 100

  // Ticks every 6h; labels every 12h to keep the axis recessive.
  const ticks = useMemo(() => {
    const out: { left: number; label: string | null }[] = []
    for (let t = ws; t <= we; t += 6 * HOUR) {
      const labeled = Math.round((t - ws) / HOUR) % 12 === 0
      out.push({ left: pct(t), label: labeled ? formatDayTime(new Date(t), zone) : null })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, we, zone])

  const now = Date.now()
  const nowLeft = now >= ws && now <= we ? pct(now) : null

  const legendStates = useMemo(() => {
    const seen = new Map<string, string>()
    for (const c of changes) {
      const v = value(c.state)
      if (!seen.has(v)) seen.set(v, display(c.state) || 'Unknown')
    }
    return [...seen.entries()].sort(([a], [b]) => Number(a) - Number(b))
  }, [changes])

  if (changes.length === 0) {
    return (
      <CenteredState title="Nothing to chart">
        <p className="max-w-md text-body-sm text-muted-foreground">
          No changes in this phase overlap the window.
        </p>
      </CenteredState>
    )
  }

  const showTip = (c: ChangeRecord) => (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({ change: c, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-4">
      {/* Axis labels */}
      <div className="relative ml-56 h-4">
        {ticks.map(
          (t) =>
            t.label && (
              <span
                key={t.left}
                className="absolute -translate-x-1/2 whitespace-nowrap text-caption text-muted-foreground"
                style={{ left: `${t.left}%` }}
              >
                {t.label}
              </span>
            ),
        )}
      </div>

      {/* Rows */}
      <div className="relative">
        {/* Grid lines spanning all rows */}
        <div className="pointer-events-none absolute inset-0 ml-56">
          {ticks.map((t) => (
            <div
              key={t.left}
              className={cn('absolute bottom-0 top-0 w-px', t.label ? 'bg-border' : 'bg-hairline-soft')}
              style={{ left: `${t.left}%` }}
            />
          ))}
          {nowLeft !== null && (
            <div className="absolute bottom-0 top-0 w-px bg-ink/50" style={{ left: `${nowLeft}%` }}>
              <span className="absolute -top-0.5 left-1.5 text-caption font-medium text-ink">
                Now
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {changes.map((c) => {
            const id = value(c.sys_id)
            const startDate = parseSnDate(value(c.start_date))
            const endDate = parseSnDate(value(c.end_date))
            const s = startDate?.getTime()
            const e = endDate?.getTime()
            const left = s !== undefined ? pct(s) : 0
            const width = e !== undefined && s !== undefined ? Math.max(pct(e) - left, 0.8) : 0.8
            const color = STATE_COLORS[value(c.state)] ?? FALLBACK_COLOR
            const selected = id === selectedId
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                // The bar's state is carried by color for sighted users (decoded by
                // the legend) and by the hover tooltip. Neither reaches assistive
                // tech, so the row's accessible name spells out state + window —
                // identity is never color-alone.
                aria-label={`${display(c.number)}: ${display(c.short_description)}. ${display(
                  c.state,
                )}, ${formatDayTime(startDate, zone)} to ${formatDayTime(endDate, zone)}.`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onOpen(id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    onOpen(id)
                  }
                }}
                onMouseMove={showTip(c)}
                onMouseLeave={() => setTip(null)}
                // The ROW takes the warm tier; the BAR does not. The bar fills
                // are dataviz-validated against the cream canvas — a hue shift
                // on hover would repaint the one channel that carries state.
                className={cn(
                  'flex h-10 cursor-pointer items-center rounded-md transition-colors',
                  FOCUS_RING,
                  selected
                    ? 'bg-surface-card'
                    : 'hover:bg-hover-surface active:bg-surface-card',
                )}
              >
                <div className="w-56 shrink-0 truncate pr-4">
                  <span className="text-caption text-muted-foreground">
                    {display(c.number)}
                  </span>
                  <span className="ml-2 text-caption font-medium text-ink">
                    {display(c.short_description)}
                  </span>
                </div>
                <div className="relative h-full flex-1">
                  <div
                    className={cn(
                      'absolute top-1/2 h-3.5 -translate-y-1/2 rounded-xs',
                      // 2px surface ring separates overlapping bars; ink ring marks selection.
                      selected ? 'ring-2 ring-ink/50' : 'ring-2 ring-background',
                    )}
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend — status identity also carried by row labels and tooltip. */}
      <div className="ml-56 flex flex-wrap gap-x-5 gap-y-1.5">
        {legendStates.map(([v, label]) => (
          <span key={v} className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: STATE_COLORS[v] ?? FALLBACK_COLOR }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Hover tooltip */}
      {tip && (
        <div
          className="pointer-events-none absolute z-10 w-64 rounded-md border border-border bg-background p-3 shadow-hairline"
          style={{ left: Math.min(tip.x + 12, 640), top: tip.y + 12 }}
        >
          <div className="text-caption text-muted-foreground">
            {display(tip.change.number)}
          </div>
          <div className="mt-0.5 text-sm font-medium text-ink">
            {display(tip.change.short_description)}
          </div>
          <div className="mt-1.5 text-caption text-body-text">
            {display(tip.change.state)} ·{' '}
            {formatDayTime(parseSnDate(value(tip.change.start_date)), zone)}{' '}
            <span className="text-muted-soft">→</span>{' '}
            {formatDayTime(parseSnDate(value(tip.change.end_date)), zone)}
          </div>
        </div>
      )}
    </div>
  )
}
