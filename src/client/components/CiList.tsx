import type { AffectedCiRecord } from '../types'
import { display, value } from '../utils/fields'
import { Card } from './ui/card'

/** Affected CIs (task_ci rows) stacked inside a single card, hairline-divided. */
export function CiList({ cis }: { cis: AffectedCiRecord[] }) {
  if (cis.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No affected CIs recorded for this change.
      </Card>
    )
  }
  return (
    <Card className="divide-y divide-hairline-soft p-0">
      {cis.map((ci) => (
        <div key={value(ci.sys_id)} className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">
              {display(ci.ci_item) || 'Unknown CI'}
            </div>
            <div className="mt-1 text-[13px] text-muted-soft">
              {display(ci['ci_item.sys_class_name'])}
            </div>
          </div>
          <div className="shrink-0 text-[13px] text-muted-soft">
            {display(ci['ci_item.operational_status'])}
          </div>
        </div>
      ))}
    </Card>
  )
}
