import type { FeedEvent, FeedEventKind } from '../services/ActivityService'
import { FEED_LIMIT } from '../services/ActivityService'
import type { JiraIssueNarrative } from '../services/JiraService'
import type { AffectedCiRecord, ChangeRecord, TaskRecord } from '../types'
import { formatDayTime, parseSnDate } from '../utils/datetime'
import { display, value } from '../utils/fields'
import { APPROVAL_LABELS, CHANGE_STATE_LABELS, TASK_STATE_LABELS } from '../utils/stateLabels'
import type { WeekendWindow } from '../utils/weekendWindow'

/**
 * The weekend, flattened for a language model.
 *
 * EVERYTHING HERE IS A DISPLAY VALUE. That is the opposite of the rule the REST
 * routes follow — those must ship RAW choice codes, because StateBadge switches
 * on the numeric value and a label silently renders the neutral grey pill (see
 * CLAUDE.md > ServiceNow gotchas). A model is the other kind of consumer: '-2'
 * is noise it has to decode, and it decodes ambiguously, because the codes are
 * per-table ('2' is In Progress on a change_task and means nothing on a
 * change_request). So this module is the one place that resolves every code to
 * its label, and it is the LAST place raw values are allowed to exist.
 *
 * The trap is sys_audit: its rows carry raw codes and NO display value at all,
 * so there is nothing for display() to fall back to. History transitions have to
 * be mapped by hand, against the map for the event's own table.
 */

/** A comment, work note, or state/approval transition — already in reading form. */
export interface PayloadEvent {
  kind: FeedEventKind
  /** Formatted in the window's timezone, e.g. 'Fri 6:02 PM'. */
  when: string
  who: string
  /** Body, on comments and work notes. */
  text?: string
  /** Labelled transition, on state and approval events: 'Scheduled → Implement'. */
  transition?: string
}

/**
 * A configuration item this change touches — the blast radius.
 *
 * This is what makes a genuine CI COLLISION findable: two changes whose planned
 * windows overlap AND which name the same CI are contending for one box, which no
 * amount of reading the schedule reveals. `operationalStatus` matters too — a
 * change against a CI that is already Non-Operational is a different conversation.
 */
export interface PayloadCi {
  name: string
  /** cmdb_ci class, e.g. 'Linux Server', 'Network Gear'. */
  ciClass: string
  operationalStatus: string
}

export interface PayloadTask {
  number: string
  shortDescription: string
  state: string
  assignedTo: string
  plannedStart: string
  plannedEnd: string
  /** The Jira issue this task carries, if any (change_task.correlation_display). */
  jiraKey: string
  history: PayloadEvent[]
}

export interface PayloadChange {
  number: string
  shortDescription: string
  description: string
  state: string
  type: string
  risk: string
  priority: string
  assignmentGroup: string
  assignedTo: string
  plannedStart: string
  plannedEnd: string
  justification: string
  implementationPlan: string
  backoutPlan: string
  testPlan: string
  closeCode: string
  closeNotes: string
  /** Affected CIs (task_ci). Empty when the change names none — many don't. */
  cis: PayloadCi[]
  tasks: PayloadTask[]
  history: PayloadEvent[]
}

/**
 * A Jira issue named by this weekend's work. `referencedBy` is the answer to the
 * question the real Jira page cannot answer — which weekend change tasks depend
 * on this issue — derived here from the tasks we already hold, rather than by
 * re-asking the server for each key.
 */
export interface PayloadJiraComment {
  author: string
  when: string
  body: string
}

export interface PayloadJira {
  key: string
  summary: string
  type: string
  status: string
  priority: string
  assignee: string
  /**
   * The issue's own words. Empty when Jira is unconfigured or could not be read —
   * which is NOT the same as an issue nobody wrote on, and renderJira says so.
   */
  description: string
  comments: PayloadJiraComment[]
  /** change_task numbers in THIS window that carry the key. */
  referencedBy: string[]
}

export interface WeekendPayload {
  window: {
    label: string
    timeZone: string
  }
  /** When the payload was assembled, in the window's zone. */
  generatedAt: string
  counts: { changes: number; tasks: number; cis: number; jiras: number; events: number }
  /**
   * True when the activity stream came back at its cap, i.e. the window has more
   * history than we hold. The prompts surface this to the model on purpose: told
   * nothing, a model reads "no events on CHG0030050" as "nothing happened" when
   * the truth is "it fell off the end of a capped list", and it will state that
   * fabricated calm with total confidence.
   */
  historyTruncated: boolean
  /**
   * True when the window names Jira keys and NOT ONE of them resolved — i.e. Jira
   * could not be read at all, rather than a Jira that genuinely lacks these keys.
   * Same reasoning as historyTruncated: unless told, a model reads an unresolved
   * issue as an unfinished one, and a post-implementation review will list every
   * issue in the weekend as a loose end because a token expired.
   */
  jiraUnresolved: boolean
  changes: PayloadChange[]
  jiras: PayloadJira[]
}

export interface PayloadInput {
  weekend: WeekendWindow
  /** IANA zone every date in the payload is rendered in (the console's own). */
  timeZone: string
  changes: ChangeRecord[]
  tasks: TaskRecord[]
  /**
   * task_ci rows for the whole window — from ChangeService.listWeekendAffectedCis,
   * which is the read that carries `task` (the parent CHANGE sys_id) so these can
   * be grouped. Rows without it cannot be attributed and are skipped.
   */
  cis: AffectedCiRecord[]
  events: FeedEvent[]
  /**
   * Resolved Jira issues WITH descriptions and comment threads, keyed by issue key
   * — from useJiraNarratives, which only fetches once the report is opened. An
   * empty map is a legitimate state (Jira unconfigured, unreachable, or still
   * loading); every key the window's tasks name still appears in the payload.
   */
  jiraIssues: Map<string, JiraIssueNarrative>
  /** The cap `events` was fetched under, for the truncation flag. */
  eventLimit?: number
  now?: Date
}

/** '—' reads as an em-dash to a model too; empty is the honest absence. */
function text(field: unknown): string {
  return display(field as never).trim()
}

/**
 * A state/approval transition, as labels. sys_audit hands us raw codes and no
 * display value, and the right map depends on the table the event happened on.
 * An unmapped code falls through as itself rather than being dropped — a
 * transition we can't name is still a transition that happened.
 */
function transitionLabel(event: FeedEvent): string | undefined {
  if (event.kind !== 'state' && event.kind !== 'approval') return undefined

  const label = (code: string | undefined): string => {
    const raw = (code ?? '').trim()
    if (!raw) return ''
    if (event.kind === 'approval') return APPROVAL_LABELS[raw.toLowerCase()] ?? raw
    const map = event.table === 'change_task' ? TASK_STATE_LABELS : CHANGE_STATE_LABELS
    return map[raw] ?? raw
  }

  const from = label(event.oldValue)
  const to = label(event.newValue)
  if (!from && !to) return undefined
  // A field set for the first time has no old value; don't invent one.
  return from ? `${from} → ${to}` : `set to ${to}`
}

function toPayloadEvent(event: FeedEvent, zone: string): PayloadEvent {
  return {
    kind: event.kind,
    when: formatDayTime(event.when, zone),
    who: event.who,
    text: event.text?.trim() || undefined,
    transition: transitionLabel(event),
  }
}

/** A ServiceNow datetime field, formatted in the window's zone. Empty stays empty. */
function when(field: unknown, zone: string): string {
  const raw = value(field as never).trim()
  if (!raw) return ''
  return formatDayTime(parseSnDate(raw), zone)
}

/**
 * Assemble the weekend into one model-ready object.
 *
 * Tasks and history are NESTED under their change on purpose. Every question
 * these prompts answer is asked per-change ("is CHG0030001 ready", "did it land",
 * "what happened to it"), and a flat sibling list would make the model join the
 * three by sys_id itself — which it does unreliably, and which costs tokens to
 * even attempt. Jiras stay top-level and are referenced by key, because one issue
 * is legitimately named by several tasks across several changes; nesting them
 * would duplicate an issue per reference.
 */
export function buildPayload(input: PayloadInput): WeekendPayload {
  const { weekend, timeZone: zone, changes, tasks, cis, events, jiraIssues } = input
  const eventLimit = input.eventLimit ?? FEED_LIMIT

  // task_ci.task holds the CHANGE sys_id (not a change_task — the name is a trap
  // inherited from task_ci being a generic task-to-CI join).
  const cisByChange = new Map<string, PayloadCi[]>()
  for (const ci of cis) {
    const parent = value(ci.task)
    if (!parent) continue // no grouping key — see PayloadInput.cis
    const bucket = cisByChange.get(parent) ?? []
    bucket.push({
      name: text(ci.ci_item),
      ciClass: text(ci['ci_item.sys_class_name']),
      operationalStatus: text(ci['ci_item.operational_status']),
    })
    cisByChange.set(parent, bucket)
  }

  // Oldest-first, so each record's history reads forward in time.
  const chronological = [...events].sort((a, b) => a.when.getTime() - b.when.getTime())
  const historyByTarget = new Map<string, PayloadEvent[]>()
  for (const event of chronological) {
    const bucket = historyByTarget.get(event.targetSysId) ?? []
    bucket.push(toPayloadEvent(event, zone))
    historyByTarget.set(event.targetSysId, bucket)
  }

  const tasksByChange = new Map<string, TaskRecord[]>()
  for (const task of tasks) {
    const parent = value(task.change_request)
    if (!parent) continue
    tasksByChange.set(parent, [...(tasksByChange.get(parent) ?? []), task])
  }

  // key → the task numbers naming it, across the whole window.
  const jiraReferences = new Map<string, string[]>()
  for (const task of tasks) {
    const key = text(task.correlation_display)
    if (!key) continue
    jiraReferences.set(key, [...(jiraReferences.get(key) ?? []), text(task.number)])
  }

  const payloadChanges: PayloadChange[] = changes.map((change) => {
    const sysId = value(change.sys_id)
    const children = tasksByChange.get(sysId) ?? []

    return {
      number: text(change.number),
      shortDescription: text(change.short_description),
      description: text(change.description),
      state: text(change.state),
      type: text(change.type),
      risk: text(change.risk),
      priority: text(change.priority),
      assignmentGroup: text(change.assignment_group),
      assignedTo: text(change.assigned_to),
      plannedStart: when(change.start_date, zone),
      plannedEnd: when(change.end_date, zone),
      justification: text(change.justification),
      implementationPlan: text(change.implementation_plan),
      backoutPlan: text(change.backout_plan),
      testPlan: text(change.test_plan),
      closeCode: text(change.close_code),
      closeNotes: text(change.close_notes),
      cis: cisByChange.get(sysId) ?? [],
      history: historyByTarget.get(sysId) ?? [],
      tasks: children.map((task) => ({
        number: text(task.number),
        shortDescription: text(task.short_description),
        state: text(task.state),
        assignedTo: text(task.assigned_to),
        // Seeded change_task planned dates are frequently empty — the console
        // shows '—' for these, and the payload shows nothing at all.
        plannedStart: when(task.planned_start_date, zone),
        plannedEnd: when(task.planned_end_date, zone),
        jiraKey: text(task.correlation_display),
        history: historyByTarget.get(value(task.sys_id)) ?? [],
      })),
    }
  })

  // Every key the window's tasks name, whether or not it resolved to a summary.
  // An unresolved key is still a real dependency; dropping it would tell the
  // model the work has no Jira, which is a different claim entirely.
  const jiras: PayloadJira[] = [...jiraReferences.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const issue = jiraIssues.get(key)
      return {
        key,
        summary: issue?.summary ?? '',
        type: issue?.type ?? '',
        status: issue?.status ?? '',
        priority: issue?.priority ?? '',
        assignee: issue?.assignee ?? '',
        description: issue?.description ?? '',
        comments: (issue?.comments ?? []).map((c) => ({
          author: c.author,
          when: formatDayTime(parseSnDate(c.when), zone),
          body: c.body,
        })),
        referencedBy: jiraReferences.get(key) ?? [],
      }
    })

  return {
    window: { label: weekend.label, timeZone: zone },
    generatedAt: formatDayTime(input.now ?? new Date(), zone),
    counts: {
      changes: payloadChanges.length,
      tasks: tasks.length,
      // Attributed CIs only — a row we couldn't group isn't in the payload, so
      // counting it here would advertise data that isn't below.
      cis: payloadChanges.reduce((n, c) => n + c.cis.length, 0),
      jiras: jiras.length,
      events: events.length,
    },
    historyTruncated: events.length >= eventLimit,
    // Not "some failed" — ALL of them. One unresolved key among many is an ordinary
    // dead reference (someone typed a key that Jira never had), and the payload says
    // so per-issue. Every key failing at once is a broken pipe, not twenty bad keys.
    jiraUnresolved: jiras.length > 0 && jiras.every((jira) => !jira.summary),
    changes: payloadChanges,
    jiras,
  }
}

/* ---------------------------------------------------------------------------
 * Rendering
 *
 * The payload goes to the model as structured TEXT, not as JSON. A window is
 * ~110 changes / ~240 tasks, and the Table API hands every field back as a
 * {value, display_value} pair — JSON.stringify of that is enormous, and most of
 * the bytes are punctuation and repeated keys rather than facts. Flat labelled
 * lines carry the same information for a fraction of the tokens, and models read
 * them at least as well.
 *
 * Empty fields are OMITTED rather than emitted as ''. This is the single biggest
 * lever on payload size: most of a weekend's 100+ routine changes carry no plan
 * text, no tasks and no history, and printing 'backout_plan:' 100 times to say
 * nothing is pure cost. Absence is legible — a change with no backout_plan line
 * simply has no backout plan, which is exactly the finding these prompts exist
 * to surface.
 * ------------------------------------------------------------------------- */

function line(out: string[], label: string, body: string): void {
  if (body) out.push(`${label}: ${body}`)
}

function renderEvent(event: PayloadEvent): string {
  const what =
    event.kind === 'state' || event.kind === 'approval'
      ? `${event.kind}: ${event.transition ?? ''}`
      : `${event.kind === 'work_note' ? 'work note' : 'comment'}: ${event.text ?? ''}`
  return `  - ${event.when} · ${event.who} · ${what}`
}

function renderChange(change: PayloadChange): string {
  const out: string[] = []
  out.push(`### ${change.number} — ${change.shortDescription} [${change.state}]`)

  // The scanning line: the facts you'd read off a card, one line, no ceremony.
  const facts = [
    change.type && `type ${change.type}`,
    change.risk && `risk ${change.risk}`,
    change.priority && `priority ${change.priority}`,
    change.assignmentGroup && `group ${change.assignmentGroup}`,
    change.assignedTo && `assignee ${change.assignedTo}`,
  ].filter(Boolean)
  if (facts.length) out.push(facts.join(' · '))

  if (change.plannedStart || change.plannedEnd) {
    out.push(`planned: ${change.plannedStart || '?'} → ${change.plannedEnd || '?'}`)
  }

  line(out, 'description', change.description)
  line(out, 'justification', change.justification)
  line(out, 'implementation plan', change.implementationPlan)
  line(out, 'backout plan', change.backoutPlan)
  line(out, 'test plan', change.testPlan)
  line(out, 'close code', change.closeCode)
  line(out, 'close notes', change.closeNotes)

  // One line, not a sub-list: a CI is a NAME plus two qualifiers, and the whole
  // reason it's in the payload is so overlapping changes can be matched on that
  // name. Keeping them inline keeps a 6-CI change to one line instead of six.
  if (change.cis.length) {
    const cis = change.cis.map((ci) => {
      const qualifiers = [ci.ciClass, ci.operationalStatus && `status ${ci.operationalStatus}`]
        .filter(Boolean)
        .join(', ')
      return qualifiers ? `${ci.name} (${qualifiers})` : ci.name
    })
    out.push(`affected CIs (${change.cis.length}): ${cis.join(' · ')}`)
  }

  if (change.tasks.length) {
    out.push(`tasks (${change.tasks.length}):`)
    for (const task of change.tasks) {
      const bits = [
        task.assignedTo && task.assignedTo,
        (task.plannedStart || task.plannedEnd) &&
          `${task.plannedStart || '?'} → ${task.plannedEnd || '?'}`,
        task.jiraKey && `jira ${task.jiraKey}`,
      ].filter(Boolean)
      out.push(
        `  - ${task.number} [${task.state}] ${task.shortDescription}` +
          (bits.length ? ` · ${bits.join(' · ')}` : ''),
      )
      for (const event of task.history) out.push(`  ${renderEvent(event)}`)
    }
  }

  if (change.history.length) {
    out.push(`history (${change.history.length}):`)
    for (const event of change.history) out.push(renderEvent(event))
  }

  return out.join('\n')
}

/**
 * Per-issue caps on the Jira half. The server already keeps only the newest 50
 * comments; these bound what reaches the model, because a weekend can name twenty
 * issues and one of them can be a two-year-old epic with a hundred replies.
 *
 * Every cut says so in the text. A model cannot tell a truncated thread from a
 * quiet one, and "nobody followed up on this issue" is exactly the kind of
 * confident, false sentence a post-implementation review must never contain.
 */
const JIRA_DESCRIPTION_CHARS = 1200
const JIRA_COMMENTS_SHOWN = 10
const JIRA_COMMENT_CHARS = 700

function clip(body: string, max: number): string {
  const trimmed = body.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()} […${trimmed.length - max} more characters, truncated]`
}

/** Keep a multi-line body inside its bullet instead of breaking the list. */
function indent(body: string): string {
  return body.split('\n').join('\n    ')
}

function renderJira(jira: PayloadJira): string {
  const bits = [
    jira.type && jira.type,
    jira.status && `status ${jira.status}`,
    jira.priority && `priority ${jira.priority}`,
    jira.assignee && `assignee ${jira.assignee}`,
  ].filter(Boolean)

  const out = [
    `- ${jira.key}${jira.summary ? ` — ${jira.summary}` : ' — (no issue found for this key)'}`,
  ]
  if (bits.length) out.push(`  ${bits.join(' · ')}`)
  if (jira.referencedBy.length) out.push(`  referenced by: ${jira.referencedBy.join(', ')}`)
  if (jira.description) {
    out.push(`  description: ${indent(clip(jira.description, JIRA_DESCRIPTION_CHARS))}`)
  }

  const shown = jira.comments.slice(-JIRA_COMMENTS_SHOWN)
  const omitted = jira.comments.length - shown.length
  if (shown.length) {
    const note = omitted ? `, ${omitted} older not shown` : ''
    out.push(`  comments (${jira.comments.length}${note}, oldest first):`)
    for (const comment of shown) {
      out.push(
        `  · ${comment.author}, ${comment.when}: ${indent(clip(comment.body, JIRA_COMMENT_CHARS))}`,
      )
    }
  }

  return out.join('\n')
}

/** The payload as the text that actually reaches the model. */
export function renderPayload(payload: WeekendPayload): string {
  const out: string[] = []

  out.push('## Weekend change window')
  out.push(`window: ${payload.window.label}`)
  out.push(`all times in: ${payload.window.timeZone}`)
  out.push(`payload assembled: ${payload.generatedAt}`)
  out.push(
    `contents: ${payload.counts.changes} changes · ${payload.counts.tasks} change tasks · ` +
      `${payload.counts.cis} affected CIs · ${payload.counts.jiras} Jira issues · ` +
      `${payload.counts.events} history events`,
  )
  if (payload.historyTruncated) {
    // Say this plainly or the model will read a change's missing history as a
    // quiet change, and report that absence as a fact.
    out.push(
      `NOTE: the history stream came back at its ${payload.counts.events}-event cap, so this is the ` +
        `MOST RECENT activity for the window, not all of it. A record with no history below may ` +
        `simply have had its older events truncated. Do not report absence of history as absence of activity.`,
    )
  }

  out.push('')
  out.push('## Changes')
  out.push(payload.changes.length ? payload.changes.map(renderChange).join('\n\n') : '(none)')

  out.push('')
  out.push('## Jira issues named by this weekend’s change tasks')
  if (payload.jiraUnresolved) {
    out.push(
      `NOTE: not one of these keys resolved, so Jira could not be read at all — unreachable, or ` +
        `not configured in the console's Settings. Their status and comments below are UNKNOWN, ` +
        `not absent. Do not report them as unfinished, and do not conclude that nobody wrote on ` +
        `them. Say the Jira side could not be read.`,
    )
  }
  out.push(payload.jiras.length ? payload.jiras.map(renderJira).join('\n') : '(none)')

  return out.join('\n')
}
