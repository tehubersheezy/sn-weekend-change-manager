import { useEffect, useState } from 'react'
import type { AmbStatus } from '../services/SnowAmb'
import { cn } from '../lib/utils'
import { PHASES, type ScreenKey } from '../utils/phases'

const CLOCK_ZONES = [
  { label: 'HK', tz: 'Asia/Hong_Kong' },
  { label: 'Zug', tz: 'Europe/Zurich' },
  { label: 'NY', tz: 'America/New_York' },
].map((z) => ({
  ...z,
  fmt: new Intl.DateTimeFormat('en-US', {
    timeZone: z.tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }),
}))

/** Team clocks: Hong Kong, Zug, New York — ticks on the half-minute. */
function WorldClocks() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div data-diag="clocks" className="flex items-center gap-4 max-lg:hidden">
      {CLOCK_ZONES.map((z) => (
        <span key={z.label} className="inline-flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted-soft">
            {z.label}
          </span>
          <span className="text-[13px] font-medium tabular-nums text-body-text">
            {z.fmt.format(now)}
          </span>
        </span>
      ))}
    </div>
  )
}

/** Connection dot per DESIGN.md: accent-teal = "active connection" indicator. */
function LiveIndicator({ status }: { status: AmbStatus }) {
  const label = status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-soft max-md:hidden">
      <span
        className={cn(
          'size-2 rounded-full',
          status === 'live' && 'bg-accent-teal',
          status === 'connecting' && 'animate-pulse bg-warning',
          status === 'offline' && 'bg-muted-soft',
        )}
      />
      {label}
    </span>
  )
}

/** Anthropic-style 4-spoke radial spike mark, inline SVG in ink. */
function SpikeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1.5 L13.7 10.3 L22.5 12 L13.7 13.7 L12 22.5 L10.3 13.7 L1.5 12 L10.3 10.3 Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * top-nav — 64px cream bar, flat (no border, no shadow) per the elevation spec.
 * Spike mark + serif wordmark at left; world clocks + live indicator at right.
 */
export function TopNav({
  liveStatus,
  screen,
  onScreenChange,
}: {
  liveStatus: AmbStatus
  screen: ScreenKey
  onScreenChange: (screen: ScreenKey) => void
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-background px-6">
      <div className="flex items-center gap-2.5">
        <SpikeMark className="size-5 text-ink" />
        <span className="font-display text-[19px] leading-none tracking-tight text-ink">
          Weekend Change Console
        </span>
      </div>
      {/* Top-level screen menu — nav-link type, active gets the category-tab-active pill. */}
      <nav className="flex items-center gap-1">
        {PHASES.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-current={screen === p.key ? 'page' : undefined}
            onClick={() => onScreenChange(p.key)}
            className={cn(
              'rounded-md px-3.5 py-2 font-sans text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15',
              screen === p.key ? 'bg-surface-card text-ink' : 'text-muted-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <WorldClocks />
        <LiveIndicator status={liveStatus} />
      </div>
    </header>
  )
}
