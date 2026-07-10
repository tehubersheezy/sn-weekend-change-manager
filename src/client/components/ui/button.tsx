import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

/**
 * Button — DESIGN.md `button-*` family.
 * Type is StyreneB 14px / 500 (text-sm font-medium), radius 8px (rounded-md).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-sm font-medium leading-none transition-colors outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 focus-visible:ring-[3px] focus-visible:ring-ring/15',
  {
    variants: {
      variant: {
        // button-primary → coral fill, white text, darkens on press, cream-tinted disabled.
        default:
          'rounded-md bg-primary text-primary-foreground active:bg-primary-active disabled:bg-border disabled:text-muted-foreground',
        // button-secondary → cream canvas fill with hairline outline, ink text.
        secondary:
          'rounded-md border border-border bg-background text-ink active:bg-surface-soft disabled:text-muted-foreground',
        // Inline transparent button; subtle cream wash on press.
        ghost:
          'rounded-md text-ink active:bg-surface-card disabled:text-muted-foreground',
        // text-link → inline coral link, underline on press.
        link: 'text-primary underline-offset-4 active:underline disabled:text-muted-foreground',
        // button-secondary-on-dark → elevated dark fill, cream text (over dark surfaces).
        darkSecondary:
          'rounded-md bg-surface-dark-elevated text-on-dark active:bg-surface-dark-soft disabled:opacity-50',
      },
      size: {
        // 40px height, 12x20 padding per DESIGN.md button spec.
        default: 'h-10 px-5 py-3',
        sm: 'h-9 rounded-md px-3.5',
        // button-icon-circular → 36px circular, hairline border.
        icon: 'size-9 rounded-full border border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
