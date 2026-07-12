import type { ChangeRecord, TaskRecord } from '../types'
import { value } from '../utils/fields'
import { formatDay, parseSnDate } from '../utils/datetime'
import { taskProgress } from '../utils/progress'
import { entranceDelay } from '../lib/utils'
import { CenteredState, GroupLabel } from './ChangeList'
import { ChangeCard } from './ChangeCard'

/** Plan screen list: changes grouped under ET day headers, ordered by start. */
export function PlanList({
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
      <CenteredState title="Nothing left to plan">
        <p className="max-w-md text-body-sm text-muted-foreground">
          No changes are awaiting assessment, authorization, or scheduling in this window.
        </p>
      </CenteredState>
    )
  }

  // changes arrive ordered by start_date, so day groups are contiguous.
  // `start` is the group's flat index across the whole list — the entrance
  // stagger runs list-wide, not per-group, so day headers don't reset the rhythm.
  const groups: { day: string; items: ChangeRecord[]; start: number }[] = []
  let count = 0
  for (const c of changes) {
    const day = formatDay(parseSnDate(value(c.start_date)))
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(c)
    else groups.push({ day, items: [c], start: count })
    count++
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.day} className="flex flex-col gap-3">
          <GroupLabel>{g.day}</GroupLabel>
          {/* Rows keyed by sys_id: an AMB refetch keeps the DOM nodes, so the
              entrance replays only on real arrivals and screen switches. */}
          {g.items.map((c, j) => (
            <div
              key={value(c.sys_id)}
              className="animate-rise-in"
              style={entranceDelay(g.start + j)}
            >
              <ChangeCard
                change={c}
                progress={taskProgress(tasksByChange.get(value(c.sys_id)) ?? [])}
                selected={value(c.sys_id) === selectedId}
                onOpen={onOpen}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
