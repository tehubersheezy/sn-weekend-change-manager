import type { ChangeRecord, TaskRecord } from '../types'
import type { SnField } from '../utils/fields'
import { display, value } from '../utils/fields'
import { taskProgress } from '../utils/progress'
import { entranceDelay } from '../lib/utils'
import { Badge } from './ui/badge'
import { CenteredState } from './ChangeList'
import { ChangeCard } from './ChangeCard'

function OutcomeBadge({ closeCode }: { closeCode: SnField }) {
  const code = value(closeCode)
  if (!code) return null
  const variant = code === 'successful' ? 'success' : code === 'unsuccessful' ? 'error' : 'warning'
  return <Badge variant={variant}>{display(closeCode)}</Badge>
}

/** Review screen list: outcome badge + close-notes preview on each card. */
export function ReviewList({
  changes,
  tasksByChange,
  selectedId,
  onOpen,
}: {
  changes: ChangeRecord[]
  tasksByChange: Map<string, TaskRecord[]>
  selectedId: string | null
  onOpen: (sysId: string) => void
}) {
  if (changes.length === 0) {
    return (
      <CenteredState title="Nothing to review yet">
        <p className="max-w-md text-body-sm text-muted-foreground">
          Changes land here once implementation wraps up and they move to Review or Closed.
        </p>
      </CenteredState>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Rows keyed by sys_id: an AMB refetch keeps the DOM nodes, so the
          entrance replays only on real arrivals and screen switches. */}
      {changes.map((c, i) => {
        const notes = display(c.close_notes)
        const hasOutcome = Boolean(value(c.close_code)) || Boolean(notes)
        return (
          <div key={value(c.sys_id)} className="animate-rise-in" style={entranceDelay(i)}>
            <ChangeCard
              change={c}
              progress={taskProgress(tasksByChange.get(value(c.sys_id)) ?? [])}
              selected={value(c.sys_id) === selectedId}
              onOpen={onOpen}
              extra={
                hasOutcome ? (
                  <div className="flex items-start gap-3">
                    <OutcomeBadge closeCode={c.close_code} />
                    {notes && (
                      <p className="line-clamp-2 min-w-0 text-caption text-muted-foreground">
                        {notes}
                      </p>
                    )}
                  </div>
                ) : undefined
              }
            />
          </div>
        )
      })}
    </div>
  )
}
