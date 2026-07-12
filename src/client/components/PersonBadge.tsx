import { User } from 'lucide-react'
import { cn, FOCUS_RING } from '../lib/utils'
import { Badge, type BadgeProps } from './ui/badge'

/**
 * A person, rendered as a badge. People are native records (sys_user), so they
 * wear the native PILL — the cream `badge-pill`, not a status tint and never
 * the Jira stamp. The glyph is decoration (muted-soft is fine for shapes), so
 * the name alone carries the identity; two badges differing only by icon would
 * violate "identity is never colour-alone" — here they differ by their text.
 *
 * Always a button: a person badge exists to be opened. Where a bare name with
 * no sys_id behind it must render (unassigned, unresolvable), show plain text
 * instead of this component — don't dangle a dead button.
 */
export function PersonBadge({
  name,
  size,
  className,
  onOpen,
}: {
  name: string
  size?: BadgeProps['size']
  className?: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      title={`Open ${name}`}
      onClick={onOpen}
      className={cn('group rounded-full text-left', FOCUS_RING, className)}
    >
      {/* A filled cream clickable deepens ONE LADDER STEP on hover
          (surface-card → surface-cream-strong): the fill is already cream, so
          its warmth gain comes from the ladder, not the peach wash. The button
          is the `group`; the badge carries transition-colors in its base. */}
      <Badge
        variant="pill"
        size={size}
        className="gap-1 group-hover:bg-surface-cream-strong"
      >
        <User className="size-3 shrink-0 text-muted-soft" aria-hidden />
        {name}
      </Badge>
    </button>
  )
}
