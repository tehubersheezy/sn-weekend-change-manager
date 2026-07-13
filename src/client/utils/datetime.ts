/**
 * Timezone helpers built on Intl — no hardcoded offsets. All ServiceNow
 * datetimes are stored/queried in UTC ('YYYY-MM-DD HH:mm:ss'); the app displays
 * and computes its weekend window in a user-selected IANA timezone (see
 * WindowConfig.timeZone), defaulting to the browser's own zone. Every function
 * that touches wall-clock time takes that zone explicitly, so the selected zone
 * lands in each component's render / useMemo dependency chain rather than hiding
 * in a module-level constant.
 */

interface WallClock {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

/** The app's fallback zone: the browser's own IANA zone (UTC if unresolved). */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** True if the IANA zone id is one Intl can construct (it throws RangeError otherwise). */
export function isValidTimeZone(zone: string): boolean {
  if (!zone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/**
 * The Intl formatters for one zone. Built once per distinct zone and cached: an
 * Intl.DateTimeFormat is comparatively expensive to construct, and these run
 * once per rendered row. A zone switch adds one cache entry; it never rebuilds
 * the set for a zone already seen.
 */
interface ZoneFormatters {
  parts: Intl.DateTimeFormat
  dayTime: Intl.DateTimeFormat
  dateTime: Intl.DateTimeFormat
  time: Intl.DateTimeFormat
  day: Intl.DateTimeFormat
  abbrev: Intl.DateTimeFormat
}

const zoneCache = new Map<string, ZoneFormatters>()

function formattersFor(zone: string): ZoneFormatters {
  let set = zoneCache.get(zone)
  if (!set) {
    set = {
      parts: new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      dayTime: new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      dateTime: new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      time: new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      day: new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      // hour is present only so timeZoneName has a companion field to render
      // beside — we read the timeZoneName part alone.
      abbrev: new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        timeZoneName: 'short',
        hour: 'numeric',
      }),
    }
    zoneCache.set(zone, set)
  }
  return set
}

/** The wall-clock components of an instant in the given zone. */
export function zoneWallClock(date: Date, zone: string): WallClock {
  const map: Record<string, string> = {}
  for (const p of formattersFor(zone).parts.formatToParts(date)) map[p.type] = p.value
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: map.hour === '24' ? 0 : +map.hour,
    minute: +map.minute,
    second: +map.second,
  }
}

/** Zone offset from UTC in ms for a given instant (e.g. -4h in EDT, -5h in EST). */
export function zoneOffsetMs(date: Date, zone: string): number {
  const wc = zoneWallClock(date, zone)
  const asUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second)
  // Compare against the instant floored to whole seconds: the Intl formatter only
  // resolves to second precision, so a sub-second `date` would otherwise make the
  // offset short by up to 999 ms (e.g. a 23:59:59.999 end would round up to the
  // next minute when serialized). Flooring keeps the offset exact.
  return asUtc - (date.getTime() - date.getMilliseconds())
}

/** Convert a wall-clock time in the given zone to the true UTC instant, DST-safe. */
export function zoneWallClockToUtc(
  zone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, ms)
  let offset = zoneOffsetMs(new Date(naive), zone)
  let instant = naive - offset
  // Re-resolve once in case the naive guess landed on the wrong side of a DST switch.
  offset = zoneOffsetMs(new Date(instant), zone)
  return new Date(naive - offset)
}

/**
 * The short zone abbreviation at a given instant — 'EDT', 'CET', 'GMT+8', … It
 * depends on the instant because the abbreviation flips across a DST boundary
 * (EST↔EDT), so callers pass the exact moment they are labeling.
 */
export function zoneAbbreviation(zone: string, atInstant: Date): string {
  for (const p of formattersFor(zone).abbrev.formatToParts(atInstant)) {
    if (p.type === 'timeZoneName') return p.value
  }
  return ''
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

/** e.g. 'Sat 9:00 PM' in the given zone. */
export function formatDayTime(date: Date | null, zone: string): string {
  return date ? formattersFor(zone).dayTime.format(date) : '—'
}

/** e.g. 'Sat Jul 12, 9:00 PM' in the given zone. */
export function formatDateTime(date: Date | null, zone: string): string {
  return date ? formattersFor(zone).dateTime.format(date) : '—'
}

/** e.g. '9:14 PM' in the given zone — for rows already under a day-group header. */
export function formatTime(date: Date | null, zone: string): string {
  return date ? formattersFor(zone).time.format(date) : '—'
}

/** e.g. 'Friday, Jul 10' in the given zone — day group headers. */
export function formatDay(date: Date | null, zone: string): string {
  return date ? formattersFor(zone).day.format(date) : 'Unscheduled'
}
