import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

/** Shared list-pane states used by the Plan / Execute / Review screens. */

export function LoadingSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function CenteredState({
  title,
  action,
  onRefresh,
  children,
}: {
  title: string
  action?: string
  onRefresh?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border py-20 text-center">
      <h2 className="text-[28px] leading-[1.2] tracking-[-0.3px] text-ink">{title}</h2>
      {children}
      {action && onRefresh && (
        <Button variant="secondary" onClick={onRefresh}>
          {action}
        </Button>
      )}
    </div>
  )
}

/** Caption-style lane / day-group header. */
export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-[1.5px] text-muted-foreground">
      {children}
    </div>
  )
}
