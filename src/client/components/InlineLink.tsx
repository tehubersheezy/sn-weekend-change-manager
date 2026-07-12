import { ExternalLink } from 'lucide-react'
import { cn } from '../lib/utils'

/**
 * Inline links that sit inside running text (feed meta lines, list rows).
 *
 * They read as interactive by weight and ink-darkness against the muted text
 * around them, not by color: coral is the system's link accent but it has to
 * stay scarce, and a feed row can carry three of these across eighty rows.
 * Underline is a press state only — DESIGN.md allows no hover styling.
 */
const INLINE_LINK =
  'rounded-sm font-medium text-ink underline-offset-4 outline-none active:underline ' +
  'focus-visible:ring-[3px] focus-visible:ring-ring/15'

/** A record number that opens something inside the console. */
export function RecordLink({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <button type="button" title={title} onClick={onClick} className={INLINE_LINK}>
      {children}
    </button>
  )
}

/**
 * A Jira issue key. Links out when the instance has a Jira base URL configured
 * (resolved server-side via the scoped scripted REST API); otherwise the key
 * still shows, just as text — a bare key beats a dead href.
 */
export function JiraLink({ issueKey, url }: { issueKey: string; url?: string }) {
  if (!url) {
    return <span className="font-medium text-ink">{issueKey}</span>
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${issueKey} in Jira`}
      className={cn(INLINE_LINK, 'inline-flex items-center gap-1')}
    >
      {issueKey}
      <ExternalLink className="size-3 text-muted-soft" aria-hidden />
    </a>
  )
}
