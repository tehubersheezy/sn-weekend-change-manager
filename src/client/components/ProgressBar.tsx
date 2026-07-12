import type { Progress } from '../utils/progress'

/**
 * Thin ink-fill progress bar on a hairline track, with an 'n/m tasks done' label.
 *
 * The fill is `bg-ink`, not coral. This bar lands on EVERY card — up to a hundred
 * of them on the Execute screen — which made it the largest coral surface in the
 * app, and DESIGN.md reserves coral for primary actions and full-bleed callouts.
 * Ink keeps the bar quiet and editorial, and leaves the coral Implement badge as
 * the one coral accent on a card: the signal that should actually pop.
 *
 * The track is `bg-ink/10`, not `bg-border`. A flat hairline fill is 1.25:1 on the
 * canvas but 1.09:1 on a SELECTED card (surface-card) — it disappears on the one
 * row the user is looking at, leaving the fill reading as a floating stub instead
 * of a fraction. An alpha of ink composites against whatever surface it lands on,
 * so the track keeps the same weight on every one.
 */
export function ProgressBar({ done, total }: Progress) {
  if (total === 0) {
    return <div className="text-caption font-medium text-muted-foreground">No tasks</div>
  }
  const pct = Math.round((done / total) * 100)
  return (
    <div className="w-40">
      <div className="mb-1 text-caption font-medium text-muted-foreground">
        {done}/{total} tasks done
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        {/* The width glides when an AMB refetch moves the fraction — progress
            is seen to advance rather than teleport. A 160px bar is cheap to
            animate; theme.css zeroes this under prefers-reduced-motion. */}
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
