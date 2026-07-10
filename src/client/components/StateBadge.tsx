import { Badge } from './ui/badge'
import { display, value, type SnValue } from '../utils/fields'

type Variant = 'pill' | 'coral' | 'success' | 'warning' | 'error' | 'teal' | 'amber' | 'outline'

/**
 * change_request.state → badge variant. New/Assess/Authorize read as neutral
 * cream pills; Scheduled teal; Implement coral (the one in-flight accent);
 * Review amber; Closed success; Canceled a muted outline.
 */
const CHANGE_STATE_VARIANT: Record<string, Variant> = {
  '-5': 'pill', // New
  '-4': 'pill', // Assess
  '-3': 'pill', // Authorize
  '-2': 'teal', // Scheduled
  '-1': 'coral', // Implement
  '0': 'amber', // Review
  '3': 'success', // Closed
  '4': 'outline', // Canceled
}

export function StateBadge({ state }: { state: SnValue }) {
  const variant = CHANGE_STATE_VARIANT[value(state)] ?? 'pill'
  return <Badge variant={variant}>{display(state) || 'Unknown'}</Badge>
}

/**
 * change_task.state → badge variant, matched on the display label so it holds up
 * across the standard task state set (Open, Work in Progress, Closed Complete /
 * Incomplete / Skipped).
 */
export function TaskStateBadge({ state }: { state: SnValue }) {
  const label = display(state) || 'Unknown'
  const lower = label.toLowerCase()
  let variant: Variant = 'pill'
  if (lower.includes('skip')) variant = 'outline'
  else if (lower.includes('incomplete')) variant = 'error'
  else if (lower.includes('complete')) variant = 'success'
  else if (lower.includes('progress')) variant = 'teal'
  else if (lower.includes('open') || lower.includes('pending')) variant = 'amber'
  return <Badge variant={variant}>{label}</Badge>
}
