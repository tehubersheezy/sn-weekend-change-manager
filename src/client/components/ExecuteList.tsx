import type { ChangeRecord, TaskRecord } from '../types'
import { value } from '../utils/fields'
import { taskProgress } from '../utils/progress'
import { entranceDelay } from '../lib/utils'
import { CenteredState, GroupLabel } from './ChangeList'
import { ChangeCard } from './ChangeCard'

/** Execute screen list: "In flight" lane (Implement) then "Up next" (Scheduled). */
export function ExecuteList({
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
  const inFlight = changes.filter((c) => value(c.state) === '-1')
  const upNext = changes.filter((c) => value(c.state) === '-2')
  const completed = changes.filter((c) => ['0', '3'].includes(value(c.state)))

  if (inFlight.length === 0 && upNext.length === 0 && completed.length === 0) {
    return (
      <CenteredState title="Nothing executing">
        <p className="max-w-md text-body-sm text-muted-foreground">
          No changes are in flight or queued to start in this window.
        </p>
      </CenteredState>
    )
  }

  // `start` carries the lane's flat offset so the entrance stagger runs across
  // all three lanes as one list — lane headers don't reset the rhythm.
  const renderLane = (
    label: string,
    items: ChangeRecord[],
    emptyNote: string,
    start: number,
  ) => (
    <div className="flex flex-col gap-3">
      <GroupLabel>{label}</GroupLabel>
      {items.length === 0 ? (
        // An empty-lane note is content, not fine print: muted-foreground (5.1:1),
        // never muted-soft (3.2:1).
        <p className="text-body-sm text-muted-foreground">{emptyNote}</p>
      ) : (
        // Rows keyed by sys_id: an AMB refetch keeps the DOM nodes, so the
        // entrance replays only on real arrivals and screen switches.
        items.map((c, j) => (
          <div key={value(c.sys_id)} className="animate-rise-in" style={entranceDelay(start + j)}>
            <ChangeCard
              change={c}
              progress={taskProgress(tasksByChange.get(value(c.sys_id)) ?? [])}
              selected={value(c.sys_id) === selectedId}
              onOpen={onOpen}
            />
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {renderLane('In flight', inFlight, 'Nothing in flight right now.', 0)}
      {renderLane('Up next', upNext, 'Nothing else queued for this window.', inFlight.length)}
      {renderLane(
        'Completed',
        completed,
        'Nothing completed yet this window.',
        inFlight.length + upNext.length,
      )}
    </div>
  )
}
