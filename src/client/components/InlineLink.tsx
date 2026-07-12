import { ExternalLink } from 'lucide-react'
import { cn, FOCUS_RING } from '../lib/utils'

/**
 * Inline links that sit inside running text (feed meta lines, list rows).
 *
 * They read as interactive by weight and ink-darkness against the muted text
 * around them, not by color: coral is the system's link accent but it has to
 * stay scarce, and a feed row can carry three of these across eighty rows.
 * Underline is a press state only — DESIGN.md allows no hover styling.
 *
 * Focus is the app's one recipe (FOCUS_RING, which brings its own outline-none).
 * These used to carry the coral-at-15% halo instead — 1.16:1 on cream. That halo
 * only reads as focus in `text-input-focused`, where a coral BORDER inside it is
 * doing the work; an inline link has no border to flip, so it had no visible
 * focus state at all.
 *
 * The ring paints 4px outside the text box, so a caller that puts one of these
 * inside an `overflow-hidden` line has to leave it room or the ring is clipped
 * away to nothing — see the meta line in ActivityFeed's FeedRow.
 */
const INLINE_LINK = `rounded-sm font-medium text-ink underline-offset-4 active:underline ${FOCUS_RING}`

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
