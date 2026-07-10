import type { Progress } from '../utils/progress'

/** Thin coral-fill progress bar on a hairline track, with an 'n/m tasks done' label. */
export function ProgressBar({ done, total }: Progress) {
  if (total === 0) {
    return <div className="text-xs text-muted-soft">No tasks</div>
  }
  const pct = Math.round((done / total) * 100)
  return (
    <div className="w-40">
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {done}/{total} tasks done
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
