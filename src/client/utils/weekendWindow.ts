import {
  addDays,
  etWallClock,
  etWallClockToUtc,
  formatDateTime,
  toSnUtc,
} from './datetime'

export interface WeekendWindow {
  /** UTC 'YYYY-MM-DD HH:mm:ss' strings for encoded queries. */
  startUtc: string
  endUtc: string
  /** True instants for display / formatting. */
  startLocal: Date
  endLocal: Date
  /** Human label, e.g. 'Fri Jul 10, 5:00 PM – Sun Jul 12, 11:59 PM ET'. */
  label: string
}

/** The change window boundaries, as ET wall-clock times ('HH:mm'). */
export interface WindowConfig {
  /** Friday start time. */
  startTime: string
  /** Sunday end time — inclusive through the end of that minute (:59.999). */
  endTime: string
}

export const DEFAULT_WINDOW_CONFIG: WindowConfig = { startTime: '17:00', endTime: '23:59' }

function parseHm(hm: string, fallback: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm) ?? /^(\d{1,2}):(\d{2})$/.exec(fallback)!
  return { hour: Math.min(+m[1], 23), minute: Math.min(+m[2], 59) }
}

/**
 * The weekend change window: Friday startTime through Sunday endTime (inclusive
 * to the end of the minute) in US Eastern, defaulting to Fri 17:00 → Sun 23:59.
 * offsetWeeks selects a specific weekend relative to the anchor: the weekend
 * containing "now", rolled forward once the current window has ended. Offsets
 * are derived from the ET timezone via Intl — never hardcoded.
 */
export function getWeekendWindow(
  opts: { now?: Date; offsetWeeks?: number; config?: WindowConfig } = {},
): WeekendWindow {
  const now = opts.now ?? new Date()
  const offsetWeeks = opts.offsetWeeks ?? 0
  const start = parseHm(opts.config?.startTime ?? '', DEFAULT_WINDOW_CONFIG.startTime)
  const end = parseHm(opts.config?.endTime ?? '', DEFAULT_WINDOW_CONFIG.endTime)

  const wc = etWallClock(now)
  // Day-of-week of today's ET calendar date (0 = Sun .. 6 = Sat).
  const dow = new Date(Date.UTC(wc.year, wc.month - 1, wc.day)).getUTCDay()

  // Delta (in days) from today to this weekend's Friday.
  const deltaToFriday = dow === 0 ? -2 : 5 - dow

  const buildWindow = (extraWeeks: number) => {
    const fri = addDays(wc.year, wc.month, wc.day, deltaToFriday + extraWeeks * 7)
    const sun = addDays(fri.year, fri.month, fri.day, 2)
    const startLocal = etWallClockToUtc(fri.year, fri.month, fri.day, start.hour, start.minute, 0, 0)
    // Inclusive through the end of the configured minute (e.g. 23:59 → 23:59:59.999).
    const endLocal = etWallClockToUtc(sun.year, sun.month, sun.day, end.hour, end.minute, 59, 999)
    // Minute-floored end for the human label so :59.999 reads as the configured
    // minute rather than rounding up to the next one.
    const endLabel = etWallClockToUtc(sun.year, sun.month, sun.day, end.hour, end.minute, 0, 0)
    return { startLocal, endLocal, endLabel }
  }

  // Anchor: the weekend containing now, rolled forward once its window has ended.
  const anchorRoll = now.getTime() > buildWindow(0).endLocal.getTime() ? 1 : 0
  const { startLocal, endLocal, endLabel } = buildWindow(anchorRoll + offsetWeeks)

  const label = `${formatDateTime(startLocal)} – ${formatDateTime(endLabel)} ET`

  return {
    startUtc: toSnUtc(startLocal),
    endUtc: toSnUtc(endLocal),
    startLocal,
    endLocal,
    label,
  }
}
