import * as React from 'react'

import { cn } from '../../lib/utils'

/**
 * Input — DESIGN.md `text-input`. Cream canvas fill, hairline border, radius 8px,
 * 40px tall. Focus shifts the border to coral with a 3px coral-at-15% ring.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-background px-3.5 py-2 font-sans text-base text-ink transition-colors outline-none',
        'placeholder:text-muted-soft',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
