import { parseSnDate } from '../utils/datetime'
import type { WeekendWindow } from '../utils/weekendWindow'

export type FeedEventKind = 'comment' | 'work_note' | 'state' | 'approval'

/** One item in the weekend activity feed. */
export interface FeedEvent {
  /** sys_id of the underlying sys_journal_field / sys_audit row. */
  id: string
  kind: FeedEventKind
  table: 'change_request' | 'change_task'
  /** sys_id of the record the event happened on (change or task). */
  targetSysId: string
  when: Date
  /** Display name when resolvable, else the raw username. */
  who: string
  /** Journal body for comment/work_note events. */
  text?: string
  /** Raw audit codes for state/approval events (see utils/stateLabels). */
  oldValue?: string
  newValue?: string
}

/** The scripted REST route declared in src/fluent/activity.now.ts. */
const ACTIVITY_ENDPOINT = '/api/x_912401_weekend_c/activity/events'

/** Wire shape: FeedEvent, except `when` rides as a ServiceNow UTC string. */
interface FeedEventDto extends Omit<FeedEvent, 'when' | 'table'> {
  when: string
  table: string
}

/** Most events the feed keeps. The server defaults to the same number. */
export const FEED_LIMIT = 80

/**
 * What the LLM payload builder asks for instead.
 *
 * The cap is window-WIDE, not per-record, which is fine for a feed nobody scrolls
 * to the bottom of and wrong for a payload a model reasons over: at 80 events
 * across ~110 changes, most changes carry no history at all, and "no history" reads
 * as "nothing happened" rather than "truncated". The server clamps this to its own
 * MAX_LIMIT, and the payload flags any response that comes back at its cap.
 */
export const PAYLOAD_FEED_LIMIT = 1000

const FEED_TABLES = new Set(['change_request', 'change_task'])

/**
 * Reads the weekend's activity stream — comments and work notes, plus state and
 * approval transitions — from the app's own scoped REST route.
 *
 * This used to query sys_journal_field and sys_audit straight from the browser,
 * which only ever worked because we were testing as admin. ITIL users, who are
 * the console's actual audience, get 403 on sys_audit and a SILENT zero rows on
 * sys_journal_field — an empty feed, no error, indistinguishable from a quiet
 * weekend. The tables are unreachable from the browser and no substitute table
 * exists, so the feed is assembled server-side instead; see src/server/activity.ts.
 *
 * Three things fell out of the move: the chunked IN-lists are gone (the front
 * proxy's ~11.5KB URI limit doesn't apply server-side), so are the 2×(N/80)+1
 * round-trips, and author display names now arrive resolved.
 */
export class ActivityService {
  async listActivity(weekend: WeekendWindow, limit: number = FEED_LIMIT): Promise<FeedEvent[]> {
    const params = new URLSearchParams({
      from: weekend.startUtc,
      to: weekend.endUtc,
      limit: String(limit),
    })
    const response = await fetch(`${ACTIVITY_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-UserToken': window.g_ck },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const detail = body?.result?.error ?? body?.error?.message
      throw new Error(detail || `HTTP error ${response.status}`)
    }

    const body = await response.json()
    // Scripted REST bodies come through raw from response.setBody(); platform
    // versions that wrap them in `result` are handled by the same read.
    const rows = (body?.result?.events ?? body?.events ?? []) as FeedEventDto[]

    const events: FeedEvent[] = []
    for (const row of rows) {
      const when = parseSnDate(row.when)
      if (!when || !FEED_TABLES.has(row.table)) continue
      events.push({ ...row, table: row.table as FeedEvent['table'], when })
    }
    // The server already ordered and capped these; the slice is belt-and-braces.
    // It slices to the REQUESTED limit, not FEED_LIMIT — a payload caller asking
    // for more must not have its extra events thrown away on arrival.
    return events.slice(0, limit)
  }
}
