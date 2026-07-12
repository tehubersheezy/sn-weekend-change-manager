import type { TaskRecord } from '../types'
import { display, value } from '../utils/fields'
import { Card } from './ui/card'
import { JiraLink } from './InlineLink'
import { TaskStateBadge } from './StateBadge'

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
 * Jira issues stacked inside a single card, hairline-divided. Keys link out to
 * Jira when `links` has a URL for them — the scripted REST API resolves those
 * server-side from the jira_base_url property, and an unconfigured instance
 * leaves the key as plain text rather than a dead href.
 */
export function JiraList({
  issues,
  links,
}: {
  issues: JiraIssue[]
  /** Jira key → browse URL, from useJiraLinks. */
  links: Map<string, string>
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
      {issues.map((issue) => (
        <div key={issue.key} className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="text-sm">
              <JiraLink issueKey={issue.key} url={links.get(issue.key)} />
            </div>
            <div className="mt-1 flex flex-col gap-1">
              {issue.tasks.map((t) => (
                <div key={value(t.sys_id)} className="text-[13px] text-muted-soft">
                  <span className="text-muted-foreground">{display(t.number)}</span>
                  {' · '}
                  {display(t.short_description) || 'Untitled task'}
                </div>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {issue.tasks.map((t) => (
              <TaskStateBadge key={value(t.sys_id)} state={t.state} />
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}
