import type { TaskRecord } from '../types'
import type { JiraIssueSummary } from '../services/JiraService'
import { display } from '../utils/fields'
import { cn, FOCUS_RING } from '../lib/utils'
import { Card } from './ui/card'
import { JiraKeyChip, JiraStatusBadge } from './JiraBadges'

/** One distinct Jira key plus the change task(s) carrying it. */
export interface JiraIssue {
  key: string
  tasks: TaskRecord[]
}

/**
 * Jira issues live on the change tasks (correlation_display holds the key);
 * collect the distinct keys across a change's tasks, keeping every task that
 * carries each key. Sorted alphabetically for a stable reading order.
 */
export function jiraIssuesFromTasks(tasks: TaskRecord[]): JiraIssue[] {
  const byKey = new Map<string, TaskRecord[]>()
  for (const t of tasks) {
    const key = display(t.correlation_display).trim()
    if (!key) continue
    byKey.set(key, [...(byKey.get(key) ?? []), t])
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, keyTasks]) => ({ key, tasks: keyTasks }))
}

/**
 * The change's Jira issues. Each row opens the issue in this pane.
 *
 * This is the THRESHOLD: native cream chrome listing foreign records. The blue
 * stays a GROUND, never an accent (DESIGN.md > Foreign Records), so it appears
 * here only on the two objects that carry provenance — the key chip and the
 * status stamp — and nowhere else on the row. The row's own chrome, its press
 * state and its focus ring are all native.
 *
 * Rows show the ISSUE, not the change task that names it. The summary comes from
 * the scoped REST API; the old row echoed the task's short_description because a
 * bare key was all it had. The task linkage now lives on the issue page, under
 * "Referenced by", which is where it belongs.
 *
 * Type and priority are deliberately absent. They are facts you read on the
 * issue, not scanning aids — putting them here would turn an eight-row list into
 * a wall of marks and cost the status stamp its findability.
 */
export function JiraList({
  issues,
  summaries,
  onOpen,
}: {
  issues: JiraIssue[]
  /** Jira key → issue summary, from useJiraSummaries. Absent = unresolved. */
  summaries: Map<string, JiraIssueSummary>
  onOpen: (key: string) => void
}) {
  if (issues.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No Jira issues on this change's tasks.
      </Card>
    )
  }
  return (
    <Card className="divide-y divide-hairline-soft p-0">
      {issues.map((issue) => {
        const summary = summaries.get(issue.key)
        const taskNumbers = issue.tasks.map((t) => display(t.number)).join(', ')

        return (
          <button
            key={issue.key}
            type="button"
            title={`Open ${issue.key}`}
            onClick={() => onOpen(issue.key)}
            className={cn(
              'flex w-full flex-col gap-1.5 p-5 text-left active:bg-surface-soft',
              // The row is a card-as-button; first and last need the card's radius
              // back, or the press fill paints square corners over it.
              'first:rounded-t-lg last:rounded-b-lg',
              FOCUS_RING,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <JiraKeyChip issueKey={issue.key} />
              {/* No summary means the lookup failed or the key isn't in Jira. The
                  row still opens — the issue page says which, and says it better
                  than a badge could. */}
              {summary && (
                <JiraStatusBadge status={summary.status} category={summary.statusCategory} />
              )}
            </div>
            {summary ? (
              <>
                <span className="text-body-sm text-body-text">{summary.summary}</span>
                <span className="text-caption text-muted-foreground">
                  {summary.assignee || 'Unassigned'}
                  {taskNumbers && ` · ${taskNumbers}`}
                </span>
              </>
            ) : (
              <span className="text-caption text-muted-foreground">{taskNumbers}</span>
            )}
          </button>
        )
      })}
    </Card>
  )
}
