import { createContext, useContext, type ReactNode } from 'react'
import { browserTimeZone } from '../utils/datetime'

/**
 * The IANA timezone the whole UI formats and computes in. Provided from app.tsx
 * as windowConfig.timeZone, consumed by every component that renders a datetime.
 *
 * Why a context and not a module-level global: the zone has to appear in every
 * useMemo / React.memo dependency chain that derives a string from a Date — the
 * activity feed's day-grouping is the trap (memoized on its items, it would keep
 * showing stale day headers after a zone switch if the zone were invisible). A
 * context value change re-renders consumers even through React.memo, and reading
 * it as `const zone = useTimeZone()` puts the zone in scope so it can be listed
 * in those dependency arrays explicitly. The provider passes the string itself,
 * so changing only the window's start/end time (same zone) re-renders nothing
 * here — a genuine zone change is the only thing that propagates.
 */
const TimeZoneContext = createContext<string>(browserTimeZone())

export function TimeZoneProvider({ zone, children }: { zone: string; children: ReactNode }) {
  return <TimeZoneContext.Provider value={zone}>{children}</TimeZoneContext.Provider>
}

/** The active display/computation timezone (see TimeZoneContext). */
export function useTimeZone(): string {
  return useContext(TimeZoneContext)
}
