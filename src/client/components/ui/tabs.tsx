import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn, FOCUS_RING } from '../../lib/utils'

/**
 * Tabs — DESIGN.md `category-tab`. The list is transparent (not the shadcn gray
 * pill container); the active trigger takes a surface-card fill with ink text.
 */
const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex items-center gap-1', className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    // Hover (the peach wash) is scoped to INACTIVE triggers: the active tab is
    // already home in surface-card and doesn't warm — hover marks a move you
    // could make, not the place you are.
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-2 font-sans text-sm font-medium text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=inactive]:hover:bg-hover-surface data-[state=active]:bg-surface-card data-[state=active]:text-ink',
      FOCUS_RING,
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    // Crossfade, not rise: a tab switch is a lateral move between siblings, so
    // the panel fades in place. (Radix unmounts inactive panels; the animation
    // fires on mount.)
    className={cn('mt-4 animate-fade-in', FOCUS_RING, className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
