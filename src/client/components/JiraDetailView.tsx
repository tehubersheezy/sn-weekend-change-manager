import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { JiraIssueDetail, JiraReference, JiraService } from '../services/JiraService'
import type { SnowAmb } from '../services/SnowAmb'
import { useRecordWatch } from '../hooks/useAmb'
import { formatDateTime, formatDay, formatTime, parseSnDate } from '../utils/datetime'
import { asStateField } from '../utils/stateLabels'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { StateBadge, TaskStateBadge } from './StateBadge'
import { JiraPriorityFact, JiraStatusBadge, JiraTypeFact } from './JiraBadges'
import type { DetailTab } from './ChangeDetailView'
import { FOCUS_RING, cn } from '../lib/utils'

/**
 * A Jira issue, rendered inside the console.
 *
 * This is a FOREIGN record and the surface says so: it paints on --jira-canvas
 * rather than the cream, because crossing a system boundary should be visible
 * and not merely announced. See DESIGN.md > Foreign records for why that blue is
 * a whisper (1.015:1 on cream) rather than a panel — anything darker would have
 * dropped the coral focus ring below its 3:1 floor. It reads because it never
 * appears alone: the console is a 50/50 split and cream is always beside it.
 *
 * The one thing NOT painted blue is deliberate, and it is the most important
 * block on the page. "Referenced by" — the weekend change tasks that name this
 * issue — is the only SERVICENOW data here, and it renders in the native cream
 * chrome, inset into the blue. Both systems are visible at once, which is exactly
 * what this record is: a Jira issue with ServiceNow work hanging off it. It is
 * also the one question the real Jira page cannot answer, which is the reason
 * this page exists at all.
 *
 * The issue fields are mock; the references are live. See src/server/jira.ts.
 *
 * FOCUS. Every focusable thing on this pane overrides the ring's offset colour to
 * --jira-canvas. The offset is a 2px gap painted in the colour of THE SURFACE THE
 * ELEMENT SITS ON, and DESIGN.md pins it to cream only because cream was the only
 * surface that existed when it was written. Left alone here it paints a cream halo
 * on blue paper.
 */
const JIRA_FOCUS = cn(FOCUS_RING, 'focus-visible:ring-offset-jira-canvas')

export function JiraDetailView({
  service,
  amb,
  issueKey,
  refreshKey,
  backLabel,
  onBack,
  onOpenChange,
}: {
  service: JiraService
  amb: SnowAmb
  issueKey: string
  refreshKey: number
  /** What closing the issue returns to — a change number, or the activity feed. */
  backLabel: string
  onBack: () => void
  onOpenChange: (sysId: string, tab?: DetailTab) => void
}) {
  const [issue, setIssue] = useState<JiraIssueDetail | null>(null)
  const [references, setReferences] = useState<JiraReference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // silent=true refetches in place (live AMB updates) without the skeleton flash.
  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const result = await service.getIssue(issueKey)
        setIssue(result.issue)
        setReferences(result.references)
        setError(null)
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Failed to load issue')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [service, issueKey],
  )

  useEffect(() => {
    void load(false)
  }, [load, refreshKey])

  // The references are live ServiceNow records: a task that starts naming this
  // issue, or moves state, updates the block below without a reload. The mock
  // issue half of the payload has nothing to watch and won't move.
  const liveRefresh = useCallback(() => void load(true), [load])
  useRecordWatch(amb, 'change_task', `correlation_display=${issueKey}`, liveRefresh)

  return (
    <div className="flex min-h-full flex-col gap-8 bg-jira-canvas px-8 py-8">
      <div className="-mb-4">
        <Button
          variant="ghost"
          size="sm"
          className={cn('-ml-3.5 text-muted-foreground', JIRA_FOCUS)}
          onClick={onBack}
        >
          <ArrowLeft />
          {backLabel}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3 bg-jira-card" />
          <Skeleton className="h-40 w-full rounded-lg bg-jira-card" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-jira-hairline py-16 text-center">
          <p className="text-body-sm text-error-ink">{error}</p>
        </div>
      ) : !issue ? (
        <NotFound issueKey={issueKey} references={references} onOpenChange={onOpenChange} />
      ) : (
        <>
          <header className="flex flex-col gap-4">
            {/* Identity is never colour-alone: the surface is blue AND it says
                Jira in words. The key is the provenance mark, so it takes the one
                chromatic token; the project name beside it is ordinary meta. */}
            <div className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
              <span className="font-medium text-jira-ink">Jira</span>
              <span aria-hidden>·</span>
              <span>{issue.projectName}</span>
              <span aria-hidden>·</span>
              <span className="font-medium text-jira-ink">{issue.key}</span>
            </div>
            {/* h2, not h1: app.tsx owns the page's h1 (the phase headline) and this
                pane is its sibling. The headline keeps the serif AND the ordinary
                --ink: the display face and the text colour are the CONSOLE's voice,
                and this is still the console. Blue marks provenance — the surface,
                the key, the stamps — not the reading. A blue serif headline would
                make this look like a different app rather than a foreign record. */}
            <h2 className="text-display-sm text-ink">{issue.summary}</h2>
            {/* One stamp, then facts. The status is the only mark that gets
                chrome — type and priority are things you read after it, and the
                moment they get pills too the status stops being findable. That
                is Jira's own UI failure mode, imported wholesale. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <JiraStatusBadge status={issue.status} category={issue.statusCategory} />
              <JiraTypeFact type={issue.type} />
              <JiraPriorityFact priority={issue.priority} />
            </div>
          </header>

          {/* The ServiceNow anchor — see the note at the top of this file. */}
          <ReferencedBy references={references} onOpenChange={onOpenChange} />

          {issue.description && (
            <section className="flex flex-col gap-2">
              <SectionLabel>Description</SectionLabel>
              {/* {component.jira-panel} — PlanCard's quiet register, one family
                  over. A div with whitespace-pre-wrap, never a <pre>: Tailwind's
                  preflight puts a mono family on <pre> with no class involved,
                  and there is no mono face in this system. */}
              <div className="whitespace-pre-wrap rounded-lg bg-jira-card p-5 text-body-sm text-body-text">
                {issue.description}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <SectionLabel>Details</SectionLabel>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-jira-card p-5">
              <Field label="Assignee" value={issue.assignee} />
              <Field label="Reporter" value={issue.reporter} />
              <Field label="Epic" value={issue.epic} />
              <Field label="Sprint" value={issue.sprint} />
              <Field
                label="Story points"
                value={issue.storyPoints === null ? '' : String(issue.storyPoints)}
              />
              <Field label="Resolution" value={issue.resolution} />
              <Field label="Created" value={formatDateTime(parseSnDate(issue.created))} />
              <Field label="Updated" value={formatDateTime(parseSnDate(issue.updated))} />
              {issue.labels.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-foreground">Labels</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {/* Outline only. These sit ON --jira-card, so a --jira-card
                        fill would vanish into its own background. */}
                    {issue.labels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center rounded-full border border-jira-hairline px-3 py-1 text-caption font-medium text-jira-ink"
                      >
                        {label}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="flex flex-col gap-2">
            <SectionLabel>
              {issue.comments.length === 1 ? '1 comment' : `${issue.comments.length} comments`}
            </SectionLabel>
            {issue.comments.length === 0 ? (
              <p className="rounded-lg bg-jira-card p-5 text-body-sm text-muted-foreground">
                No comments on this issue.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {issue.comments.map((comment) => (
                  <li key={comment.id} className="rounded-lg bg-jira-card p-5">
                    <div className="flex flex-wrap items-baseline gap-x-2 text-caption text-muted-foreground">
                      <span className="font-medium text-ink">{comment.author}</span>
                      <span>
                        {formatDay(parseSnDate(comment.when))} at{' '}
                        {formatTime(parseSnDate(comment.when))}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-body-sm text-body-text">
                      {comment.body}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-caption-upper font-medium uppercase text-muted-foreground">{children}</h3>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      {/* An empty Jira field is genuinely empty — say so rather than dropping the
          row, so the rail's shape doesn't change from issue to issue. */}
      <dd className="mt-0.5 text-body-sm text-ink">{value || '—'}</dd>
    </div>
  )
}

/**
 * The weekend change tasks that name this issue — the only ServiceNow data on
 * this page, and the only question the real Jira page cannot answer.
 *
 * It paints in the NATIVE cream chrome, inset into the blue surface. That is the
 * whole idea: the boundary between the two systems is the CONTENT here, not a
 * theme. Someone reading this block is looking at both systems at once.
 */
function ReferencedBy({
  references,
  onOpenChange,
}: {
  references: JiraReference[]
  onOpenChange: (sysId: string, tab?: DetailTab) => void
}) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Referenced by</SectionLabel>
      {references.length === 0 ? (
        <p className="rounded-lg bg-jira-card p-5 text-body-sm text-muted-foreground">
          No weekend change task references this issue.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {references.map((ref) => {
            // A task whose parent change the caller can't read still lists — it
            // just has nowhere to navigate to. Don't dangle a dead button.
            const openable = Boolean(ref.changeSysId)
            const body = (
              <>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-caption font-medium text-ink">{ref.taskNumber}</span>
                  <TaskStateBadge state={asStateField('change_task', ref.taskState)} size="sm" />
                </div>
                <div className="mt-1 text-body-sm text-body-text">
                  {ref.taskShortDescription || 'Untitled task'}
                </div>
                {ref.changeNumber && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-hairline-soft pt-3 text-caption text-muted-foreground">
                    <span className="font-medium text-ink">{ref.changeNumber}</span>
                    <StateBadge state={asStateField('change_request', ref.changeState)} size="sm" />
                    <span className="min-w-0 truncate">{ref.changeShortDescription}</span>
                  </div>
                )}
              </>
            )

            // Cream card on the blue page — the native surface, quoted verbatim.
            // NB the classes are `border-border`/`bg-background`, not DESIGN.md's
            // token names (`hairline`/`canvas`): those emit no CSS at all, which
            // rendered this card transparent and borderless on the blue — the one
            // idea the page is built around, invisible, with nothing to catch it.
            const surface = 'rounded-lg border border-border bg-background p-5 text-left'

            return openable ? (
              <button
                key={ref.taskSysId}
                type="button"
                title={`Open ${ref.changeNumber} on its Change tasks tab`}
                onClick={() => onOpenChange(ref.changeSysId, 'tasks')}
                className={cn(surface, 'active:bg-surface-soft', JIRA_FOCUS)}
              >
                {body}
              </button>
            ) : (
              <div key={ref.taskSysId} className={surface}>
                {body}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/**
 * A key with no issue behind it. Not an error — the key is simply not one this
 * Jira knows. The references still resolve, so the page can say something true
 * and useful rather than just failing.
 */
function NotFound({
  issueKey,
  references,
  onOpenChange,
}: {
  issueKey: string
  references: JiraReference[]
  onOpenChange: (sysId: string, tab?: DetailTab) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          <span className="font-medium text-jira-ink">Jira</span>
          <span aria-hidden>·</span>
          <span className="font-medium text-jira-ink">{issueKey}</span>
        </div>
        <h2 className="text-display-sm text-ink">Not in Jira</h2>
        <p className="max-w-md text-body-sm text-muted-foreground">
          No issue with this key came back from Jira. It may have been deleted, moved to another
          project, or never existed — the key is recorded on the change task either way.
        </p>
      </header>
      <ReferencedBy references={references} onOpenChange={onOpenChange} />
    </div>
  )
}
