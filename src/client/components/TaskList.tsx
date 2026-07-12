import type { TaskRecord } from '../types'
import { display, value } from '../utils/fields'
import { formatDayTime, parseSnDate } from '../utils/datetime'
import { Card } from './ui/card'
import { TaskStateBadge } from './StateBadge'
import { JiraKeyChip } from './JiraBadges'
import { PersonBadge } from './PersonBadge'
import { RecordLink } from './InlineLink'

/**
 * Stacked change_task rows inside a single card, hairline-divided.
 *
 * Rows are deliberately NOT buttons: a row carries up to three destinations
 * (the task, its assignee, its parent change), and a row-as-button would nest
 * interactive elements. Instead each fact is its own link — the task number is
 * a RecordLink to the task's page, the assignee a PersonBadge — and each
 * renders as plain text when its handler is absent.
 *
 * The Jira key is a JiraKeyChip (the boundary object), display-only here: the
 * task's own page is where the key becomes a link. It used to be a cream
 * badge-pill, which put a foreign identifier in native chrome — exactly the
 * drift DESIGN.md > Foreign Records exists to prevent.
 */
export function TaskList({
  tasks,
  showChange = false,
  showAssignee = true,
  onOpenTask,
  onOpenPerson,
  onOpenChange,
}: {
  tasks: TaskRecord[]
  /** Name (and link) the parent change on each row — for lists that cross
      changes, like the person page. Inside one change it is pure noise. */
  showChange?: boolean
  showAssignee?: boolean
  onOpenTask?: (taskSysId: string, changeSysId: string) => void
  onOpenPerson?: (personSysId: string) => void
  onOpenChange?: (changeSysId: string) => void
}) {
  if (tasks.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">No change tasks for this change.</Card>
    )
  }
  return (
    <Card className="divide-y divide-hairline-soft p-0">
      {tasks.map((t) => {
        const start = parseSnDate(value(t.planned_start_date))
        const end = parseSnDate(value(t.planned_end_date))
        const number = display(t.number)
        const assigneeId = value(t.assigned_to)
        const assigneeName = display(t.assigned_to)
        const changeId = value(t.change_request)
        return (
          <div
            key={value(t.sys_id)}
            className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {onOpenTask ? (
                  <RecordLink
                    title={`Open ${number}`}
                    onClick={() => onOpenTask(value(t.sys_id), changeId)}
                  >
                    <span className="text-caption">{number}</span>
                  </RecordLink>
                ) : (
                  <span className="font-sans text-caption text-muted-foreground">{number}</span>
                )}
                {display(t.correlation_display) && (
                  <JiraKeyChip issueKey={display(t.correlation_display)} />
                )}
              </div>
              <div className="mt-0.5 text-sm font-medium text-ink">
                {display(t.short_description) || 'Untitled task'}
              </div>
              {/* Who is on the hook is content, not fine print — muted-soft is
                  3.2:1 on cream and this is 13px. */}
              {showAssignee && (
                <div className="mt-1.5 text-caption text-muted-foreground">
                  {assigneeId && onOpenPerson ? (
                    <PersonBadge
                      name={assigneeName || 'Unknown'}
                      size="sm"
                      onOpen={() => onOpenPerson(assigneeId)}
                    />
                  ) : (
                    assigneeName || 'Unassigned'
                  )}
                </div>
              )}
              {showChange && display(t.change_request) && (
                <div className="mt-1.5 text-caption text-muted-foreground">
                  {changeId && onOpenChange ? (
                    <RecordLink
                      title={`Open ${display(t.change_request)}`}
                      onClick={() => onOpenChange(changeId)}
                    >
                      <span className="text-caption">{display(t.change_request)}</span>
                    </RecordLink>
                  ) : (
                    display(t.change_request)
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
              <TaskStateBadge state={t.state} />
              <div className="font-sans text-caption text-body-text">
                {/* The arrow is a glyph, not content — it stays decorative. */}
                {formatDayTime(start)} <span className="text-muted-soft">→</span> {formatDayTime(end)}
              </div>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
