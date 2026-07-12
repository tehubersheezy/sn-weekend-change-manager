import type { ChangeRecord, TaskRecord } from '../types'
import { value } from '../utils/fields'
import { formatDay, parseSnDate } from '../utils/datetime'
import { taskProgress } from '../utils/progress'
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
  const groups: { day: string; items: ChangeRecord[] }[] = []
  for (const c of changes) {
    const day = formatDay(parseSnDate(value(c.start_date)))
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(c)
    else groups.push({ day, items: [c] })
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.day} className="flex flex-col gap-3">
          <GroupLabel>{g.day}</GroupLabel>
          {g.items.map((c) => (
            <ChangeCard
              key={value(c.sys_id)}
              change={c}
              progress={taskProgress(tasksByChange.get(value(c.sys_id)) ?? [])}
              selected={value(c.sys_id) === selectedId}
              onOpen={onOpen}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
