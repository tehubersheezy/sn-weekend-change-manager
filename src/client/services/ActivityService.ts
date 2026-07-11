import { display, value, type SnField } from '../utils/fields'
import { parseSnDate } from '../utils/datetime'
import { chunkIds, tableQuery } from './tableApi'

export type FeedEventKind = 'comment' | 'work_note' | 'state' | 'approval'

/** One item in the weekend activity feed, normalized from journal + audit rows. */
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
  /** Raw audit codes for state/approval events. */
  oldValue?: string
  newValue?: string
}

/** sys_journal_field row (sysparm_display_value=all). */
interface JournalRow {
  sys_id: SnField
  name: SnField
  element: SnField
  element_id: SnField
  value: SnField
  sys_created_on: SnField
  sys_created_by: SnField
}

/** sys_audit row (sysparm_display_value=all). */
interface AuditRow {
  sys_id: SnField
  tablename: SnField
  fieldname: SnField
  documentkey: SnField
  oldvalue: SnField
  newvalue: SnField
  user: SnField
  sys_created_on: SnField
}

interface UserRow {
  user_name: SnField
  name: SnField
}

/** Per-source fetch cap per id-chunk; the merged feed is capped separately. */
const PAGE_LIMIT = '50'

/** Most events the merged feed keeps after sorting. */
export const FEED_LIMIT = 80

const FEED_TABLES = new Set(['change_request', 'change_task'])

/**
 * Reads the weekend's activity stream: comments and work notes from
 * sys_journal_field plus state/approval transitions from sys_audit, scoped to
 * the loaded window's change + task sys_ids. Both tables key records by plain
 * sys_id strings (element_id / documentkey), so scoping is IN-list based and
 * chunked. fieldname is whitelisted because approval-history journal noise
 * also lands in sys_audit ("JOURNAL FIELD ADDITION" rows).
 */
export class ActivityService {
  /** username → display name, cached across refetches for the app's lifetime. */
  private userNames = new Map<string, string>()

  async listActivity(recordSysIds: string[]): Promise<FeedEvent[]> {
    if (recordSysIds.length === 0) return []
    const chunks = chunkIds(recordSysIds)

    const journalCalls = chunks.map((ids) =>
      tableQuery<JournalRow>(
        'sys_journal_field',
        new URLSearchParams({
          sysparm_fields: 'sys_id,name,element,element_id,value,sys_created_on,sys_created_by',
          sysparm_query:
            `nameINchange_request,change_task^elementINcomments,work_notes` +
            `^element_idIN${ids.join(',')}^ORDERBYDESCsys_created_on`,
          sysparm_limit: PAGE_LIMIT,
        }),
      ),
    )
    const auditCalls = chunks.map((ids) =>
      tableQuery<AuditRow>(
        'sys_audit',
        new URLSearchParams({
          sysparm_fields: 'sys_id,tablename,fieldname,documentkey,oldvalue,newvalue,user,sys_created_on',
          sysparm_query:
            `tablenameINchange_request,change_task^fieldnameINstate,approval` +
            `^documentkeyIN${ids.join(',')}^ORDERBYDESCsys_created_on`,
          sysparm_limit: PAGE_LIMIT,
        }),
      ),
    )

    const [journalPages, auditPages] = await Promise.all([
      Promise.all(journalCalls),
      Promise.all(auditCalls),
    ])

    const events = [
      ...journalPages.flat().map((row) => this.fromJournal(row)),
      ...auditPages.flat().map((row) => this.fromAudit(row)),
    ].filter((e): e is FeedEvent => e !== null)

    // Newest first; sys_id tiebreak keeps seed bursts (same-second rows) stable.
    events.sort((a, b) => b.when.getTime() - a.when.getTime() || a.id.localeCompare(b.id))
    const top = events.slice(0, FEED_LIMIT)

    await this.resolveUsers(top)
    return top
  }

  private fromJournal(row: JournalRow): FeedEvent | null {
    const table = value(row.name)
    const when = parseSnDate(value(row.sys_created_on))
    if (!FEED_TABLES.has(table) || !when) return null
    return {
      id: value(row.sys_id),
      kind: value(row.element) === 'work_notes' ? 'work_note' : 'comment',
      table: table as FeedEvent['table'],
      targetSysId: value(row.element_id),
      when,
      who: value(row.sys_created_by),
      text: display(row.value),
    }
  }

  private fromAudit(row: AuditRow): FeedEvent | null {
    const table = value(row.tablename)
    const when = parseSnDate(value(row.sys_created_on))
    if (!FEED_TABLES.has(table) || !when) return null
    return {
      id: value(row.sys_id),
      kind: value(row.fieldname) === 'approval' ? 'approval' : 'state',
      table: table as FeedEvent['table'],
      targetSysId: value(row.documentkey),
      when,
      who: value(row.user),
      oldValue: value(row.oldvalue),
      newValue: value(row.newvalue),
    }
  }

  /**
   * Swap raw usernames (sys_audit.user / journal sys_created_by are strings,
   * not references) for sys_user display names. One lookup per unseen name,
   * misses cached as-is so 'system' and deleted accounts don't requery forever.
   */
  private async resolveUsers(events: FeedEvent[]): Promise<void> {
    const unseen = [...new Set(events.map((e) => e.who))].filter(
      (name) => name && !this.userNames.has(name),
    )
    if (unseen.length > 0) {
      try {
        const rows = await tableQuery<UserRow>(
          'sys_user',
          new URLSearchParams({
            sysparm_fields: 'user_name,name',
            sysparm_query: `user_nameIN${unseen.join(',')}`,
            sysparm_limit: String(unseen.length),
          }),
        )
        for (const row of rows) {
          // Accounts can have an empty display name (no first/last set) —
          // fall through to the username rather than caching a blank author.
          const label = display(row.name)
          if (label) this.userNames.set(value(row.user_name), label)
        }
      } catch {
        /* names are decoration — fall back to raw usernames */
      }
      for (const name of unseen) {
        if (!this.userNames.has(name)) this.userNames.set(name, name)
      }
    }
    for (const e of events) e.who = this.userNames.get(e.who) ?? e.who
  }
}
