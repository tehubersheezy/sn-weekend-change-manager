import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

/**
 * Badge — DESIGN.md `badge-pill` / `badge-coral` / `badge-status`.
 *  - pill    : surface-card fill, ink text (badge-pill)
 *  - coral   : coral fill, white text, uppercase + tracked (badge-coral)
 *  - success/warning/error/teal/amber : tinted status pills (badge-status)
 *  - outline : hairline border, ink text
 *
 * The status pills paint the semantic hue at 15% for the FILL and take the
 * deeper `-ink` step for the LABEL. The old form used one hue for both, which
 * measured 1.8-2.1:1 — the badge is the primary status indicator on every card
 * in the app, and four of five were effectively unreadable. See theme.css.
 *
 * `text-caption` lives in the base, not in `size`, so `size` carries padding
 * only and the coral variant's `text-caption-upper` still wins under cn()'s
 * last-wins merge. No leading-* here on purpose: the size token carries its own
 * line-height (13px/1.4 = {typography.caption}).
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full font-sans text-caption font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        pill: 'bg-surface-card text-ink',
        coral: 'bg-primary uppercase text-caption-upper text-primary-foreground',
        success: 'bg-success/15 text-success-ink',
        warning: 'bg-warning/15 text-warning-ink',
        error: 'bg-destructive/15 text-error-ink',
        teal: 'bg-accent-teal/15 text-teal-ink',
        amber: 'bg-accent-amber/15 text-amber-ink',
        outline: 'border border-border text-ink',
      },
      size: {
        // DESIGN.md badge padding: 4px x 12px.
        default: 'px-3 py-1',
        // Sits inline inside 14px running text (the activity feed).
        sm: 'px-2 py-0.5',
      },
    },
    defaultVariants: {
      variant: 'pill',
      size: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
