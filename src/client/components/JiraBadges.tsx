import {
  BookOpen,
  Bug,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Circle,
  GitBranch,
  Minus,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { JiraStatusCategory } from '../services/JiraService'
import { cn } from '../lib/utils'

/**
 * Marks for a FOREIGN record. DESIGN.md > Foreign Records is the contract; the
 * two rules that shape everything here are worth restating at the call site.
 *
 * BLUE IS A GROUND, NEVER AN ACCENT. {colors.jira-ink} paints a key, a stamp
 * label, a type glyph — provenance. It never paints a link, an emphasis, or
 * anything on a native record. It is not in the accent vocabulary; coral is still
 * the only voltage this system has.
 *
 * SERVICENOW BADGES ARE PILLS; JIRA BADGES ARE STAMPS. A ServiceNow "Closed" is a
 * tinted green pill. A Jira "Done" is a solid blue square. They differ on three
 * channels at once — shape, hue, fill density — so they cannot collide on a
 * screen showing both systems, and the ladder is lightness rather than hue, so it
 * survives colour-vision deficiency and greyscale.
 */
const STAMP =
  'inline-flex items-center rounded-xs px-3 py-1 font-sans text-caption font-medium whitespace-nowrap'

/**
 * Hollow → tinted → solid, as the issue completes.
 *
 * Only `todo` carries a border: it has no fill, so the edge IS the object. The
 * tinted and solid steps are opaque and find their own edge on every surface a
 * stamp can land on. The solid "Done" measures 5.53:1 (jira-on on jira-ink) —
 * the most legible badge in the app; white on the coral button is 3.28:1.
 */
const STATUS_DENSITY: Record<JiraStatusCategory, string> = {
  todo: 'border border-jira-hairline text-jira-ink',
  'in-progress': 'bg-jira-card text-jira-ink',
  done: 'bg-jira-ink text-jira-on',
}

/**
 * The issue's status — and the ONLY stamp an issue gets. Type and priority are
 * {@link JiraFact}s, with no chrome at all, so this mark stays rare and therefore
 * meaningful. Three pills in a row is what Jira's own UI does, and it is why you
 * cannot tell at a glance what any of them say.
 *
 * `category` drives the density; `status` is the label Jira actually uses, which
 * is per-project and can be anything ("In Review", "Blocked"), so it is never
 * derived from the category — only styled by it.
 */
export function JiraStatusBadge({
  status,
  category,
}: {
  status: string
  category: JiraStatusCategory
}) {
  return <span className={cn(STAMP, STATUS_DENSITY[category] ?? STATUS_DENSITY.todo)}>{status}</span>
}

const TYPE_ICON: Record<string, LucideIcon> = {
  Story: BookOpen,
  Bug: Bug,
  Task: CheckSquare,
  Epic: Zap,
  'Sub-task': GitBranch,
}

/** Jira's own priority glyphs: the ladder everyone already reads without a legend. */
const PRIORITY_ICON: Record<string, LucideIcon> = {
  Highest: ChevronsUp,
  High: ChevronUp,
  Medium: Minus,
  Low: ChevronDown,
  Lowest: ChevronsDown,
}

/**
 * A fact about the issue: a glyph in the Jira hue, a word in the console's ink.
 * No pill, no fill, no border.
 *
 * This is where the surface refuses to become badge soup. Type and priority are
 * things you read AFTER the status, not competitors to it, and the moment they
 * get chrome the status stops being findable. The glyph carries the provenance
 * tint (it is a shape, and 5.53:1 on this pane); the word stays {colors.ink},
 * because a High priority is not "more Jira" than a Low one.
 */
function JiraFact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-ink">
      <Icon className="size-4 shrink-0 text-jira-ink" aria-hidden />
      {label}
    </span>
  )
}

export function JiraTypeFact({ type }: { type: string }) {
  return <JiraFact icon={TYPE_ICON[type] ?? Circle} label={type} />
}

export function JiraPriorityFact({ priority }: { priority: string }) {
  return <JiraFact icon={PRIORITY_ICON[priority] ?? Minus} label={priority} />
}

/**
 * THE BOUNDARY OBJECT: a Jira key rendered inside a NATIVE surface — a feed meta
 * line, a Jiras-tab row. An identifier, not a badge, hence the tight 1px x 6px.
 *
 * It always carries its own border, and that is not decoration. {colors.jira-card}
 * as a fill on a selected {colors.surface-card} row measures 1.007:1 — it
 * vanishes completely. An object that crosses a boundary brings its own edge.
 *
 * tabular-nums, not a mono face: the issue number needs to align, and that is
 * what the sans face's numeric feature is for. There is no mono in this system.
 */
export function JiraKeyChip({ issueKey }: { issueKey: string }) {
  return (
    <span className="inline-flex items-center rounded-xs border border-jira-hairline bg-jira-card px-1.5 py-px font-sans text-caption font-medium tabular-nums text-jira-ink">
      {issueKey}
    </span>
  )
}
