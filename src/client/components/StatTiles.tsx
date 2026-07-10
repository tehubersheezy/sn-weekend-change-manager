export interface Stat {
  label: string
  value: number | string
}

/** Compact stat chips: serif number + caption label on one line, content-sized. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="inline-flex items-baseline gap-2 rounded-lg bg-surface-card px-4 py-2"
        >
          <span className="font-display text-[22px] leading-none tracking-tight text-ink">
            {s.value}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted-foreground">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}
