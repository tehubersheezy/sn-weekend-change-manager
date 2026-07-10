import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

/**
 * Badge — DESIGN.md `badge-*` + semantic status pills.
 *  - pill    : surface-card fill, ink text, 13px/500 (badge-pill)
 *  - coral   : coral fill, white text, 12px/500 uppercase tracking (badge-coral)
 *  - success/warning/error/teal/amber : soft tinted pills (semantic tint bg, full-strength text)
 *  - outline : hairline border, ink text
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full font-sans font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        pill: 'bg-surface-card px-3 py-1 text-[13px] leading-tight text-ink',
        coral:
          'bg-primary px-3 py-1 text-xs uppercase tracking-[1.5px] text-primary-foreground',
        success: 'bg-success/15 px-3 py-1 text-[13px] leading-tight text-success',
        warning: 'bg-warning/15 px-3 py-1 text-[13px] leading-tight text-warning',
        error: 'bg-destructive/15 px-3 py-1 text-[13px] leading-tight text-destructive',
        teal: 'bg-accent-teal/15 px-3 py-1 text-[13px] leading-tight text-accent-teal',
        amber: 'bg-accent-amber/15 px-3 py-1 text-[13px] leading-tight text-accent-amber',
        outline: 'border border-border px-3 py-1 text-[13px] leading-tight text-ink',
      },
    },
    defaultVariants: {
      variant: 'pill',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
