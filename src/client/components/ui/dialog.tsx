import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn, FOCUS_RING } from '../../lib/utils'

/**
 * Dialog — Radix dialog. Overlay is ink at ~40% alpha; the content panel is a
 * cream canvas card with radius 12px, hairline border, generous padding.
 */
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 animate-fade-in bg-ink/40 data-[state=closed]:animate-fade-out',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    {/* The -50%/-50% centering lives HERE and nowhere else. dialog-in/-out used to
        repeat it inside their keyframes, on the v3-era belief that an animation owns
        `transform` for its whole run and would otherwise fling the panel out of
        centre while scaling. Tailwind v4 broke that premise: `-translate-x-1/2` emits
        the standalone `translate` property, which COMPOSES with the keyframes'
        `transform` instead of being overridden by it, so the panel was displaced 100%
        of its own size — half off the left edge, header above the top of the window —
        and fill-mode `both` held it there. Keep the keyframes to scale and opacity.
        Radix holds the closing dialog mounted until dialog-out finishes (150ms, ~75%
        of the 200ms open — exits are quicker than entrances).

        The width clamp is `calc(100% - 2rem)`, not `w-full`: a fixed element's 100% IS
        the viewport, so max-w-lg (or a caller's max-w-4xl) is the only thing holding
        the panel off the edges, and on a window narrower than the cap the gutter goes
        to zero. It has to live on WIDTH rather than max-width because callers override
        max-w-* and tailwind-merge would drop a competing max-w on this line. */}
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-8 text-ink outline-none',
        'animate-dialog-in data-[state=closed]:animate-dialog-out',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-5 top-5 rounded-sm text-muted-foreground transition-colors hover:text-hover-ink disabled:pointer-events-none',
          FOCUS_RING,
        )}
      >
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-display-xs text-ink', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
