import * as React from 'react'

import { cn } from '../../lib/utils'

/**
 * Skeleton — loading placeholder. Pulses on a surface-card cream tone.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-surface-card', className)} {...props} />
}

export { Skeleton }
