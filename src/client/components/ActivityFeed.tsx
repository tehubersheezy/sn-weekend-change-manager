import { Fragment, useMemo } from 'react'
import { ArrowRight, CheckCircle2, CircleDot, MessageSquare, Sparkles, StickyNote } from 'lucide-react'
import type { FeedEvent } from '../services/ActivityService'
import { FEED_LIMIT } from '../services/ActivityService'
import type { JiraService } from '../services/JiraService'
import type { ChangeRecord, TaskRecord } from '../types'
import { useJiraLinks } from '../hooks/useJiraLinks'
import { display, value } from '../utils/fields'
import { formatDay, formatTime } from '../utils/datetime'
import { asStateField } from '../utils/stateLabels'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { GroupLabel } from './ChangeList'
import type { DetailTab } from './ChangeDetailView'
import { JiraLink, RecordLink } from './InlineLink'
import { jiraIssuesFromTasks } from './JiraList'
import { StateBadge, TaskStateBadge } from './StateBadge'

/** A feed event joined to the loaded change (and task) it belongs to. */
interface FeedItem {
  event: FeedEvent
  change: ChangeRecord
  task?: TaskRecord
  /** Jira keys this row can link to — see jiraKeysFor. */
  jiraKeys: string[]
}

/**
 * Jira keys live on change tasks, never on the change itself. A task row offers
 * that task's key; a change row offers every distinct key across its tasks.
 * Same derivation the Jiras tab uses, so the two can't drift.
 */
const jiraKeysFor = (tasks: TaskRecord[]) => jiraIssuesFromTasks(tasks).map((i) => i.key)

/** Meta-line separator between the record numbers, Jira keys, and description. */
const Sep = () => <span className="text-muted-soft"> · </span>

const KIND_ICON = {
  comment: MessageSquare,
  work_note: StickyNote,
  state: CircleDot,
  approval: CheckCircle2,
} as const

const APPROVAL_BADGE: Record<string, { label: string; variant: 'success' | 'error' | 'amber' | 'outline' }> = {
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  requested: { label: 'Approval requested', variant: 'amber' },
  'not requested': { label: 'Approval reset', variant: 'outline' },
}

/**
 * The right pane's resting view: everything moving across the weekend window —
 * comments, work notes, state transitions, approvals — newest first, grouped
 * by ET day. Live updates arrive silently via useActivityFeed.
 *
 * Rows are not click targets. Each one exposes its records explicitly instead:
 * the change number, the change task number when the event happened on a task,
 * and any Jira keys — so a row says what it touched and lets you pick one,
 * rather than swallowing the whole card into a single destination.
 */
export function ActivityFeed({
  events,
  loading,
  error,
  changes,
  tasks,
  jiraService,
  onOpen,
}: {
  events: FeedEvent[]
  loading: boolean
  error: string | null
  changes: ChangeRecord[]
  tasks: TaskRecord[]
  jiraService: JiraService
  onOpen: (sysId: string, tab?: DetailTab) => void
}) {
  // Join events to loaded records; events on records that left the window
  // (or task events whose parent isn't loaded) drop out here.
  const items = useMemo<FeedItem[]>(() => {
    const changesById = new Map(changes.map((c) => [value(c.sys_id), c]))
    const tasksById = new Map(tasks.map((t) => [value(t.sys_id), t]))
    const tasksByChange = new Map<string, TaskRecord[]>()
    for (const t of tasks) {
      const changeId = value(t.change_request)
      if (!changeId) continue
      const siblings = tasksByChange.get(changeId)
      if (siblings) siblings.push(t)
      else tasksByChange.set(changeId, [t])
    }

    const joined: FeedItem[] = []
    for (const event of events) {
      if (event.table === 'change_task') {
        const task = tasksById.get(event.targetSysId)
        const change = task && changesById.get(value(task.change_request))
        if (task && change) joined.push({ event, change, task, jiraKeys: jiraKeysFor([task]) })
      } else {
        const change = changesById.get(event.targetSysId)
        if (change) {
          const jiraKeys = jiraKeysFor(tasksByChange.get(event.targetSysId) ?? [])
          joined.push({ event, change, jiraKeys })
        }
      }
    }
    return joined
  }, [events, changes, tasks])

  // One resolve for every key on screen; JiraService caches across renders and
  // shares its cache with the detail pane's Jiras tab.
  const jiraKeys = useMemo(() => [...new Set(items.flatMap((i) => i.jiraKeys))], [items])
  const jiraLinks = useJiraLinks(jiraService, jiraKeys)

  const days = useMemo(() => {
    const groups: { day: string; items: FeedItem[] }[] = []
    for (const item of items) {
      const day = formatDay(item.event.when)
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.items.push(item)
      else groups.push({ day, items: [item] })
    }
    return groups
  }, [items])

  return (
    <div className="flex flex-col gap-8 px-8 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          {/* h2, not h1: app.tsx owns the page's h1 (the phase headline), and this
              pane is its sibling — same level as the list pane's heading. */}
          <h2 className="text-display-sm text-ink">Weekend activity</h2>
          <p className="mt-1.5 text-body-sm text-muted-foreground">
            Comments, work notes, and state changes across every change in this window, as they
            happen. Open any change, task, or Jira an update names.
          </p>
        </div>
        {/* AI status summary — visual only for now, generation not wired up yet. */}
        <Button size="sm" className="shrink-0" title="Summarize where the weekend stands">
          <Sparkles />
          Status Summary
        </Button>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border py-16 text-center">
          <p className="text-body-sm text-error-ink">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border px-8 py-16 text-center">
          {/* h3 — it nests under the pane's own h2. The hand-rolled 22px/-0.2px
              it used to carry is now a real step on the scale: display-xs. */}
          <h3 className="text-display-xs text-ink">All quiet</h3>
          <p className="mx-auto mt-2 max-w-sm text-body-sm text-muted-foreground">
            Nothing has moved in this window yet. Comments, work notes, and state changes will
            appear here the moment they land.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((group) => (
            <section key={group.day} className="flex flex-col gap-1">
              <GroupLabel>{group.day}</GroupLabel>
              <ol className="divide-y divide-hairline-soft">
                {group.items.map((item) => (
                  <li key={item.event.id}>
                    <FeedRow item={item} jiraLinks={jiraLinks} onOpen={onOpen} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {events.length >= FEED_LIMIT && (
            <p className="text-caption text-muted-foreground">
              Showing the latest {FEED_LIMIT} updates.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * One update. The row is inert — only the records it names are actionable:
 * the change, the change task the event landed on, and the Jira keys riding on
 * that work. Truncation clips the description tail, never the links, because
 * the links lead.
 */
function FeedRow({
  item,
  jiraLinks,
  onOpen,
}: {
  item: FeedItem
  jiraLinks: Map<string, string>
  onOpen: (sysId: string, tab?: DetailTab) => void
}) {
  const { event, change, task, jiraKeys } = item
  const Icon = KIND_ICON[event.kind]
  const changeSysId = value(change.sys_id)

  return (
    <div className="flex w-full items-start gap-3 py-4">
      {/* Kind is also stated in words by EventLine below — the icon is a glyph. */}
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-soft" />
      <div className="min-w-0 flex-1">
        {/*
         * The -m-1.5/p-1.5 pair is load-bearing, not decoration. `truncate` means
         * `overflow: hidden`, which clips descendants to this box's PADDING edge
         * — and the record links inside paint a focus ring 4px outside their own
         * box. With no padding, that ring is clipped away on every side and the
         * links are back to having no visible focus state, which is the whole
         * defect FOCUS_RING exists to fix. 6px of padding gives the ring room;
         * the equal negative margin cancels it, so the content box, the
         * truncation width and the row's layout are all bit-for-bit unchanged.
         */}
        <div className="-m-1.5 truncate p-1.5 font-sans text-caption text-muted-foreground">
          <RecordLink title={`Open ${display(change.number)}`} onClick={() => onOpen(changeSysId)}>
            {display(change.number)}
          </RecordLink>
          {task && (
            <>
              <Sep />
              {/* Change tasks have no page of their own — open the parent change
                  on its Change tasks tab, where this task is listed. */}
              <RecordLink
                title={`Open ${display(task.number)} on ${display(change.number)}`}
                onClick={() => onOpen(changeSysId, 'tasks')}
              >
                {display(task.number)}
              </RecordLink>
            </>
          )}
          {jiraKeys.map((key) => (
            <Fragment key={key}>
              <Sep />
              <JiraLink issueKey={key} url={jiraLinks.get(key)} />
            </Fragment>
          ))}
          <Sep />
          <span className="text-body-text">
            {display(change.short_description) || 'Untitled change'}
          </span>
        </div>
        <EventLine event={event} task={task} />
        {/*
         * The amber rule marks a work note (internal) against a comment (visible
         * to the requester) — a distinction worth carrying, and it is never the
         * only carrier: EventLine says "added a work note" in words and the row
         * icon differs too, so identity is not color-alone.
         */}
        {(event.kind === 'comment' || event.kind === 'work_note') && event.text && (
          <p
            className={cn(
              'mt-2 line-clamp-4 whitespace-pre-wrap border-l-2 pl-3 text-body-sm text-body-text',
              event.kind === 'work_note' ? 'border-accent-amber' : 'border-border',
            )}
          >
            {event.text}
          </p>
        )}
      </div>
      <span className="shrink-0 font-sans text-caption text-muted-foreground">
        {formatTime(event.when)}
      </span>
    </div>
  )
}

/** The one-line description of what happened: who did what. */
function EventLine({ event, task }: { event: FeedEvent; task?: TaskRecord }) {
  const who = <span className="font-medium text-ink">{event.who}</span>

  if (event.kind === 'comment' || event.kind === 'work_note') {
    return (
      <div className="mt-1 text-sm text-muted-foreground">
        {who} {event.kind === 'comment' ? 'commented' : 'added a work note'}
        {task && ' on this task'}
      </div>
    )
  }

  if (event.kind === 'approval') {
    const badge = APPROVAL_BADGE[event.newValue ?? ''] ?? {
      label: event.newValue || 'Approval updated',
      variant: 'outline' as const,
    }
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {who}{' '}
        <Badge variant={badge.variant} size="sm">
          {badge.label}
        </Badge>
      </div>
    )
  }

  // State transition — rendered with the validated status badge palette.
  const isTask = event.table === 'change_task'
  const from = asStateField(event.table, event.oldValue ?? '')
  const to = asStateField(event.table, event.newValue ?? '')
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {who} <span>moved{isTask ? ' task' : ''}</span>
      {isTask ? (
        <TaskStateBadge state={from} size="sm" />
      ) : (
        <StateBadge state={from} size="sm" />
      )}
      {/* Direction of travel, not a status — the glyph stays decorative. */}
      <ArrowRight className="size-3.5 text-muted-soft" />
      {isTask ? <TaskStateBadge state={to} size="sm" /> : <StateBadge state={to} size="sm" />}
    </div>
  )
}
