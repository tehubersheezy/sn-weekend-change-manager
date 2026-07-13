import { GlideRecord, GlideRecordSecure, gs } from '@servicenow/glide'

/**
 * The weekend activity feed, served from the app's own scope.
 *
 * WHY THIS EXISTS AT ALL: the console's audience is ITIL users, and they cannot
 * read the tables this feed is built from. Verified on dev421992 against an
 * itil/sn_change_write user with no audit_viewer:
 *
 *   sys_audit          403 User Not Authorized
 *   sys_journal_field  200 with ZERO rows — blanket, and it fails SILENTLY
 *   sys_history_set    403      (and sys_history_line is only reachable through it)
 *
 * The read ACLs on both tables grant only to `audit_viewer`, which the `itil`
 * role does not contain (only `audit_admin` does); the role-less ACLs alongside
 * them are *denies*, because as of Xanadu an empty ACL denies rather than grants.
 * Changing those ACLs is not on the table.
 *
 * So the browser cannot read this data, and no other table carries it —
 * sys_history_* is lazily materialized, rotated weekly and dropped at 28 days
 * ("Don't use history sets to generate reports" — ServiceNow docs). The feed has
 * to be assembled server-side, which is what this route does.
 *
 * HOW IT STAYS SAFE: a scripted REST script runs as the CALLING user, and plain
 * server-side GlideRecord does not enforce ACLs (that is precisely what
 * GlideRecordSecure adds). This route leans on both halves of that, in this order:
 *
 *   1. GlideRecordSecure resolves the weekend population — so it contains exactly
 *      the changes THIS caller is allowed to read, and nothing else.
 *   2. Plain GlideRecord then reads sys_journal_field / sys_audit *scoped to those
 *      sys_ids*, stepping over the table ACL that would otherwise return nothing.
 *
 * The order is the safety property. Step 2 is only sound because step 1 already
 * proved the caller may see every record it touches. Never widen step 2's query
 * beyond the ids step 1 returned, and never take an encoded query from the caller.
 */

/** Most events the merged feed returns, newest first. Mirrors the client's FEED_LIMIT. */
const FEED_LIMIT = 80

/**
 * Ceiling on ?limit=. The feed asks for FEED_LIMIT; the LLM payload builder asks
 * for far more, because its cap is window-WIDE — at 80 events across ~110 changes,
 * most changes contribute no history at all, and a model reads that silence as
 * "nothing happened" rather than "truncated". A higher cap is what makes the
 * payload's history complete enough to reason over.
 */
const MAX_LIMIT = 1000

/** ?limit=, clamped to [1, MAX_LIMIT]. Anything unparseable falls back to the feed's cap. */
function readLimit(request: any): number {
    const raw = queryParam(request, 'limit').trim()
    if (!raw) return FEED_LIMIT
    const parsed = parseInt(raw, 10)
    if (isNaN(parsed) || parsed < 1) return FEED_LIMIT
    return parsed > MAX_LIMIT ? MAX_LIMIT : parsed
}

/**
 * Population safety net. A weekend is ~350 changes + ~240 tasks; this only trips
 * on a pathological window, and we log rather than silently truncate the feed.
 */
const POPULATION_LIMIT = 2000

/**
 * sys_id IN-lists are built server-side, so the front proxy's ~11.5KB URI limit
 * (which forces the client to chunk at 80) does not apply here — but one IN
 * clause over a whole weekend is still worth splitting. Each chunk fetches a
 * full `limit` of rows so that merging chunks and taking the global top N is
 * exact: any single chunk could legitimately own every event in the final feed.
 */
const ID_CHUNK = 200

/** ServiceNow encoded-query datetime, always UTC: 'YYYY-MM-DD HH:MM:SS'. */
const SN_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

type FeedEventKind = 'comment' | 'work_note' | 'state' | 'approval'

/** Wire shape. Matches FeedEvent in the client's ActivityService, except `when` rides as a string. */
interface FeedEvent {
    /** sys_id of the underlying sys_journal_field / sys_audit row. */
    id: string
    kind: FeedEventKind
    table: string
    /** sys_id of the record the event happened on (change or task). */
    targetSysId: string
    /** ServiceNow UTC datetime; the client parses it with parseSnDate. */
    when: string
    /** Display name when resolvable, else the raw username. */
    who: string
    /** Journal body, on comment / work_note events. */
    text?: string
    /** Raw choice codes, on state / approval events — the client maps them to labels. */
    oldValue?: string
    newValue?: string
}

/**
 * Read a scripted-REST query param as a plain string. ServiceNow hands back an
 * array of values per param, so a naive string read yields ''.
 */
function queryParam(request: any, name: string): string {
    const params = request && request.queryParams
    if (!params) return ''
    const raw = params[name]
    if (raw === undefined || raw === null) return ''
    if (typeof raw === 'string') return raw
    if (typeof raw.join === 'function') return raw.join(',')
    return String(raw)
}

function chunk(ids: string[], size: number): string[][] {
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size))
    return chunks
}

/**
 * Mirrors weekendChangeQuery() in the client's ChangeService — keep them in step.
 * change_request's planned dates are start_date/end_date (their LABELS read
 * "Planned start/end date"; planned_start_date does not exist on this table).
 * Canceled (4) and New (-5) are excluded: neither is weekend workload.
 */
function weekendChangeQuery(from: string, to: string): string {
    return 'start_date<=' + to + '^end_date>=' + from + '^state!=4^state!=-5'
}

/**
 * Mirrors weekendTaskQuery(). A change_task's OWN planned dates are frequently
 * empty, so a task belongs to the weekend iff its parent change does — same
 * predicate, dot-walked through the parent reference.
 *
 * The trailing state!=4 is the TASK's own state: the parent predicate only drops
 * tasks whose whole change was canceled, and a task canceled on a live change is
 * not weekend workload either. It must match the client's weekendTaskQuery
 * exactly or the feed scopes to a different population than the list it annotates.
 */
function weekendTaskQuery(from: string, to: string): string {
    return (
        'change_request.start_date<=' + to +
        '^change_request.end_date>=' + from +
        '^change_request.state!=4^change_request.state!=-5' +
        '^state!=4'
    )
}

/**
 * The authorization boundary. GlideRecordSecure enforces the caller's ACLs, so
 * this returns only the weekend records THIS user may read — which is what makes
 * the un-ACL'd journal/audit reads below safe.
 */
function securePopulation(table: string, query: string): string[] {
    const gr = new GlideRecordSecure(table)
    gr.addEncodedQuery(query)
    gr.setLimit(POPULATION_LIMIT)
    gr.query()

    const ids: string[] = []
    while (gr.next()) ids.push(String(gr.getValue('sys_id')))

    if (ids.length === POPULATION_LIMIT) {
        gs.warn(
            '[weekend-console] ' + table + ' population hit the ' + POPULATION_LIMIT +
            '-row cap; the activity feed may be missing events for this window.',
        )
    }
    return ids
}

/**
 * Comments and work notes. Plain GlideRecord steps over the sys_journal_field
 * read ACL, which returns zero rows for every non-audit_viewer user — scoped to
 * the ACL-checked population, so it exposes nothing the caller couldn't already see.
 */
function readJournal(recordIds: string[], limit: number): FeedEvent[] {
    const events: FeedEvent[] = []
    const chunks = chunk(recordIds, ID_CHUNK)

    for (let c = 0; c < chunks.length; c++) {
        const gr = new GlideRecord('sys_journal_field')
        gr.addEncodedQuery(
            'nameINchange_request,change_task' +
            '^elementINcomments,work_notes' +
            '^element_idIN' + chunks[c].join(','),
        )
        gr.orderByDesc('sys_created_on')
        gr.setLimit(limit)
        gr.query()

        while (gr.next()) {
            events.push({
                id: String(gr.getValue('sys_id')),
                kind: String(gr.getValue('element')) === 'work_notes' ? 'work_note' : 'comment',
                table: String(gr.getValue('name')),
                targetSysId: String(gr.getValue('element_id')),
                when: String(gr.getValue('sys_created_on')),
                who: String(gr.getValue('sys_created_by')),
                text: String(gr.getValue('value')),
            })
        }
    }
    return events
}

/**
 * State and approval transitions. Same ACL bypass, same scoping. `fieldname` is
 * whitelisted because approval-history journal noise also mirrors into sys_audit
 * as "JOURNAL FIELD ADDITION" rows, which are not feed events.
 */
function readAudit(recordIds: string[], limit: number): FeedEvent[] {
    const events: FeedEvent[] = []
    const chunks = chunk(recordIds, ID_CHUNK)

    for (let c = 0; c < chunks.length; c++) {
        const gr = new GlideRecord('sys_audit')
        gr.addEncodedQuery(
            'tablenameINchange_request,change_task' +
            '^fieldnameINstate,approval' +
            '^documentkeyIN' + chunks[c].join(','),
        )
        gr.orderByDesc('sys_created_on')
        gr.setLimit(limit)
        gr.query()

        while (gr.next()) {
            events.push({
                id: String(gr.getValue('sys_id')),
                kind: String(gr.getValue('fieldname')) === 'approval' ? 'approval' : 'state',
                table: String(gr.getValue('tablename')),
                targetSysId: String(gr.getValue('documentkey')),
                when: String(gr.getValue('sys_created_on')),
                who: String(gr.getValue('user')),
                // sys_audit stores raw choice codes with no display value; the
                // client's stateLabels map turns these into badges.
                oldValue: String(gr.getValue('oldvalue')),
                newValue: String(gr.getValue('newvalue')),
            })
        }
    }
    return events
}

/**
 * sys_audit.user and sys_journal_field.sys_created_by are username STRINGS, not
 * references — there is nothing to dot-walk. Resolve them to display names in one
 * query so the browser doesn't need a second round-trip to sys_user.
 */
function resolveAuthors(events: FeedEvent[]): void {
    const usernames: string[] = []
    for (let i = 0; i < events.length; i++) {
        const who = events[i].who
        if (who && usernames.indexOf(who) < 0) usernames.push(who)
    }
    if (usernames.length === 0) return

    const displayNames: { [username: string]: string } = {}
    const gr = new GlideRecord('sys_user')
    gr.addEncodedQuery('user_nameIN' + usernames.join(','))
    gr.setLimit(usernames.length)
    gr.query()
    while (gr.next()) {
        const label = String(gr.getValue('name') || '').trim()
        // An account can have no first/last name set — fall through to the raw
        // username rather than rendering a blank author.
        if (label) displayNames[String(gr.getValue('user_name'))] = label
    }

    for (let i = 0; i < events.length; i++) {
        const label = displayNames[events[i].who]
        if (label) events[i].who = label
    }
}

/** Newest first; sys_id tiebreak keeps same-second bursts (seed data) stable. */
function newestFirst(a: FeedEvent, b: FeedEvent): number {
    if (a.when !== b.when) return a.when < b.when ? 1 : -1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * GET /api/x_912401_weekend_c/activity/events?from=<utc>&to=<utc>[&limit=<n>]
 *
 * Both bounds are UTC 'YYYY-MM-DD HH:MM:SS' — the client's WeekendWindow.startUtc
 * and .endUtc, verbatim. `limit` defaults to the feed's 80 and is capped at
 * MAX_LIMIT; the LLM payload builder is the caller that asks for more.
 */
export function weekendActivity(request: any, response: any): void {
    const from = queryParam(request, 'from').trim()
    const to = queryParam(request, 'to').trim()
    const limit = readLimit(request)

    // Reject malformed bounds rather than coercing them. ServiceNow silently
    // DROPS invalid terms from an encoded query, so a bad date would not error —
    // it would quietly widen the population to every change in the instance.
    if (!SN_DATETIME.test(from) || !SN_DATETIME.test(to)) {
        response.setStatus(400)
        response.setBody({
            error: "from/to are required, as UTC datetimes formatted 'YYYY-MM-DD HH:MM:SS'",
        })
        return
    }

    const recordIds = securePopulation('change_request', weekendChangeQuery(from, to)).concat(
        securePopulation('change_task', weekendTaskQuery(from, to)),
    )
    if (recordIds.length === 0) {
        response.setBody({ events: [] })
        return
    }

    const events = readJournal(recordIds, limit).concat(readAudit(recordIds, limit))
    events.sort(newestFirst)

    const top = events.slice(0, limit)
    resolveAuthors(top)
    response.setBody({ events: top })
}
