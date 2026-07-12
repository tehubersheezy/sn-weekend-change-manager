import { cn, FOCUS_RING } from '../lib/utils'
import { JiraKeyChip } from './JiraBadges'

/**
 * Inline links that sit inside running text (feed meta lines, list rows).
 *
 * They read as interactive by weight and ink-darkness against the muted text
 * around them, not by color: coral is the system's link accent but it has to
 * stay scarce, and a feed row can carry three of these across eighty rows.
 * On hover the ink warms to hover-ink — the warm tier's one voice for
 * interactive type — and underline stays the press state.
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
const INLINE_LINK = `rounded-sm font-medium text-ink transition-colors hover:text-hover-ink underline-offset-4 active:underline ${FOCUS_RING}`

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
 * A Jira issue key named inside a native (ServiceNow) surface — a feed meta line,
 * a list row. THE BOUNDARY OBJECT.
 *
 * This used to be an <a target="_blank"> onto a Jira browse URL: the console knew
 * a key existed and then handed you off to another product. It doesn't anymore —
 * the key opens the console's own Jira issue view, served by the app's scoped
 * REST API. An anchor that leaves and a button that navigates in-app are
 * different promises, and this is the button.
 *
 * The chip carries the provenance tint even out here on the cream, and that does
 * NOT break "blue is a ground, never an accent" (DESIGN.md > Foreign Records).
 * The blue is not making the key stand out; it is saying where the key LIVES.
 * The proof is that it buys no emphasis: the chip sits in a muted meta line
 * beside the change and task numbers, and reads as their peer, not their superior.
 *
 * It brings its own border because it crosses a boundary — {colors.jira-card} as
 * a bare fill on a selected surface-card row measures 1.007:1 and vanishes.
 *
 * Focus keeps the NATIVE recipe: this button sits on cream, and the ring's offset
 * is always the colour of the surface the element is on. Only the Jira pane itself
 * flips that offset to {colors.jira-canvas}.
 *
 * Hover stays inside the BLUE family (`interactive` on the chip): a foreign
 * object never warms toward coral — that would repaint its provenance as
 * emphasis. The button is a `group` because the hover states live on the chip's
 * own border, where the boundary object keeps all of its identity.
 */
export function JiraLink({
  issueKey,
  onOpen,
}: {
  issueKey: string
  onOpen: (key: string) => void
}) {
  return (
    <button
      type="button"
      title={`Open ${issueKey}`}
      onClick={() => onOpen(issueKey)}
      className={cn('group rounded-xs align-baseline', FOCUS_RING)}
    >
      <JiraKeyChip issueKey={issueKey} interactive />
    </button>
  )
}
