export interface Stat {
  label: string
  value: number | string
}

/**
 * Compact stat chips: serif number + caption label on one line, content-sized.
 *
 * The numeral is `{typography.display-xs}` — 22px Copernicus. Serif stat values
 * are on-brand (DESIGN.md sets a pricing card's *price* in the display face);
 * they simply had no token below 28px until display-xs was added.
 */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="inline-flex items-baseline gap-2 rounded-lg bg-surface-card px-4 py-2"
        >
          <span className="font-display text-display-xs text-ink">{s.value}</span>
          <span className="text-caption-upper font-medium uppercase text-muted-foreground">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}
