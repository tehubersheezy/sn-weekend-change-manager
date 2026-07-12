import type { TaskRecord } from '../types'
import { display, value } from '../utils/fields'
import { formatDayTime, parseSnDate } from '../utils/datetime'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { TaskStateBadge } from './StateBadge'

/** Stacked change_task rows inside a single card, hairline-divided. */
export function TaskList({ tasks }: { tasks: TaskRecord[] }) {
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
        return (
          <div
            key={value(t.sys_id)}
            className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sans text-caption text-muted-foreground">
                  {display(t.number)}
                </span>
                {/* Jira key — display only, intentionally not a link for now. */}
                {display(t.correlation_display) && (
                  <Badge variant="pill">{display(t.correlation_display)}</Badge>
                )}
              </div>
              <div className="mt-0.5 text-sm font-medium text-ink">
                {display(t.short_description) || 'Untitled task'}
              </div>
              {/* Who is on the hook is content, not fine print — muted-soft is
                  3.2:1 on cream and this is 13px. */}
              <div className="mt-1 text-caption text-muted-foreground">
                {display(t.assigned_to) || 'Unassigned'}
              </div>
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
