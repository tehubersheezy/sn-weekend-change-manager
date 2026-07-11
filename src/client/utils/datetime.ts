/**
 * Timezone helpers built on Intl — no hardcoded offsets. All ServiceNow
 * datetimes are stored/queried in UTC ('YYYY-MM-DD HH:mm:ss'); the app displays
 * everything in US Eastern.
 */
export const ET_ZONE = 'America/New_York'

interface WallClock {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** The ET wall-clock components for a given instant. */
export function etWallClock(date: Date): WallClock {
  const map: Record<string, string> = {}
  for (const p of partsFmt.formatToParts(date)) map[p.type] = p.value
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: map.hour === '24' ? 0 : +map.hour,
    minute: +map.minute,
    second: +map.second,
  }
}

/** ET offset from UTC in ms for a given instant (e.g. -4h in EDT, -5h in EST). */
export function etOffsetMs(date: Date): number {
  const wc = etWallClock(date)
  const asUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second)
  // Compare against the instant floored to whole seconds: the Intl formatter only
  // resolves to second precision, so a sub-second `date` would otherwise make the
  // offset short by up to 999 ms (e.g. a 23:59:59.999 end would round up to the
  // next minute when serialized). Flooring keeps the offset exact.
  return asUtc - (date.getTime() - date.getMilliseconds())
}

/** Convert an ET wall-clock time to the true UTC instant, DST-safe. */
export function etWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, ms)
  let offset = etOffsetMs(new Date(naive))
  let instant = naive - offset
  // Re-resolve once in case the naive guess landed on the wrong side of a DST switch.
  offset = etOffsetMs(new Date(instant))
  return new Date(naive - offset)
}

/** Date components N days after a calendar date (handles month/year rollover). */
export function addDays(year: number, month: number, day: number, n: number) {
  const d = new Date(Date.UTC(year, month - 1, day + n))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** Serialize a Date to a ServiceNow UTC query string 'YYYY-MM-DD HH:mm:ss'. */
export function toSnUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/** Parse a ServiceNow UTC datetime value into a Date (null on empty/invalid). */
export function parseSnDate(raw: string): Date | null {
  if (!raw) return null
  const d = new Date(raw.replace(' ', 'T') + 'Z')
  return isNaN(d.getTime()) ? null : d
}

const dayTimeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** e.g. 'Sat 9:00 PM' in ET. */
export function formatDayTime(date: Date | null): string {
  return date ? dayTimeFmt.format(date) : '—'
}

/** e.g. 'Sat Jul 12, 9:00 PM' in ET. */
export function formatDateTime(date: Date | null): string {
  return date ? dateTimeFmt.format(date) : '—'
}

const timeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** e.g. '9:14 PM' in ET — for rows already under a day-group header. */
export function formatTime(date: Date | null): string {
  return date ? timeFmt.format(date) : '—'
}

const dayFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

/** e.g. 'Friday, Jul 10' in ET — day group headers. */
export function formatDay(date: Date | null): string {
  return date ? dayFmt.format(date) : 'Unscheduled'
}
