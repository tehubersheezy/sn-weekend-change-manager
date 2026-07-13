import { ArrowRight } from 'lucide-react'
import type { ChangeRecord } from '../types'
import type { Progress } from '../utils/progress'
import { cn, FOCUS_RING } from '../lib/utils'
import { display, value } from '../utils/fields'
import { formatDayTime, parseSnDate } from '../utils/datetime'
import { useTimeZone } from '../context/TimeZone'
import { Card } from './ui/card'
import { StateBadge } from './StateBadge'
import { ProgressBar } from './ProgressBar'

/** Comma-joined non-empty meta values (assignment group / type / risk). */
function metaLine(change: ChangeRecord): string {
  return [display(change.assignment_group), display(change.type), display(change.risk)]
    .filter(Boolean)
    .join('  ·  ')
}

/**
 * One change row as a clickable cream card: number + short description + meta on
 * the left, state / planned window / task progress on the right.
 *
 * Selection is announced with `aria-current`, not `aria-pressed`: the card is not
 * a toggle button, it opens a detail view — and on the Execute screen a hundred
 * cards each announcing "not pressed" is pure screen-reader noise.
 */
export function ChangeCard({
  change,
  progress,
  selected = false,
  extra,
  onOpen,
}: {
  change: ChangeRecord
  progress: Progress
  selected?: boolean
  /** Optional full-width footer content (e.g. Review outcome + close notes). */
  extra?: React.ReactNode
  onOpen: (sysId: string) => void
}) {
  const zone = useTimeZone()
  const start = parseSnDate(value(change.start_date))
  const end = parseSnDate(value(change.end_date))
  const meta = metaLine(change)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(value(change.sys_id))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(value(change.sys_id))
        }
      }}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        // Press is surface-card — a preview of the selection it's about to
        // cause. (surface-soft as a press is indistinguishable from the hover
        // wash since the warm-tier amendment.)
        'group cursor-pointer p-6 transition-colors active:bg-surface-card',
        FOCUS_RING,
        // Selected = the cream category-tab-active treatment, and it does NOT
        // warm on hover: the card is already home. Unselected cards take the
        // peach wash + warmed edge (the warm tier).
        selected ? 'bg-surface-card' : 'hover:border-hover-hairline hover:bg-hover-surface',
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-sans text-caption text-muted-foreground">
            {display(change.number)}
          </div>
          <div className="mt-1 flex items-start gap-1.5 text-title-sm font-medium text-ink">
            <span className="min-w-0">{display(change.short_description) || 'Untitled change'}</span>
            {/* The one kinetic accent on the app's primary object: the arrow
                leans the way the card will take you. Dies under
                prefers-reduced-motion (theme.css zeroes transition-transform). */}
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-soft transition-transform group-hover:translate-x-0.5" />
          </div>
          {/* The meta line is content people read (group / type / risk), so it
              takes muted-foreground. Only the glyphs stay at muted-soft. */}
          {meta && <div className="mt-1.5 text-caption text-muted-foreground">{meta}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <StateBadge state={change.state} />
          <div className="font-sans text-caption text-body-text">
            {formatDayTime(start, zone)} <span className="text-muted-soft">→</span>{' '}
            {formatDayTime(end, zone)}
          </div>
          <div className="sm:flex sm:justify-end">
            <ProgressBar {...progress} />
          </div>
        </div>
      </div>
      {extra && <div className="mt-4 border-t border-hairline-soft pt-3">{extra}</div>}
    </Card>
  )
}
