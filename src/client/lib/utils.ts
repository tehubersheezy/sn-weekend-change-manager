import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The DESIGN.md type scale, as registered in styles/theme.css (`--text-*`).
 *
 * This list is not decoration. tailwind-merge only knows Tailwind's stock class
 * names; it classifies any text-* class it doesn't recognize as a COLOR. So a
 * theme size token and a color token land in the same conflict group and the
 * last one wins — `cn('text-caption', 'text-ink')` returned just `text-ink`,
 * silently deleting the size while the CSS still compiled. Teaching twMerge the
 * scale is what makes these tokens survive cn() at runtime.
 *
 * Keep in sync with the `--text-*` block in theme.css: a token in one file but
 * not the other is a token that quietly does nothing.
 */
const TEXT_SCALE = [
  'display-md',
  'display-sm',
  'display-xs',
  'title-lg',
  'title-md',
  'title-sm',
  'body-md',
  'body-sm',
  'caption',
  'caption-upper',
]

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: TEXT_SCALE }] } },
})

/**
 * Merge Tailwind class names, resolving conflicts (last-wins) while allowing
 * conditional/variadic inputs via clsx. Standard shadcn `cn` helper, taught the
 * scale above.
 *
 * One consequence worth knowing: tailwind-merge treats font-size as conflicting
 * with leading-*, because our size tokens carry their own line-height. A
 * `leading-*` written BEFORE a size token is dropped; write it after the size
 * token if you really mean to override the token's line-height.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The app's one focus recipe. Import it; don't retype it.
 *
 * The ring is full-strength coral, not the coral-at-15% halo the app used to
 * carry everywhere. That halo is 1.16:1 against the cream canvas — an invisible
 * focus state, and WCAG 2.4.11 wants >= 3:1. It was lifted from DESIGN.md's
 * `text-input-focused`, where the halo is only the outer glow around a coral
 * BORDER — the border is the part you actually see. Inputs and selects still
 * flip that border and are the only place the halo is legitimate; everything
 * with no border to flip (buttons, tabs, cards, links) got the glow alone and
 * therefore nothing. Full coral is 3.11:1 on cream, and the 2px canvas offset
 * keeps the ring readable on the coral primary button, where a coral ring would
 * otherwise dissolve into the fill.
 */
export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

/**
 * Entrance stagger for `animate-rise-in` rows: 20ms per row, capped at 12 rows
 * so a 100-row Execute list settles in ~460ms total (240ms max delay + 220ms
 * animation) instead of trailing entrances for two seconds. The animation
 * token carries fill-mode `both`, so a delayed row holds its from-state
 * (invisible) while it waits — without that, rows flash visible, vanish, then
 * animate. Under prefers-reduced-motion the animation is `none` and the delay
 * is inert.
 */
export function entranceDelay(index: number): { animationDelay: string } {
  return { animationDelay: `${Math.min(index, 12) * 20}ms` }
}
