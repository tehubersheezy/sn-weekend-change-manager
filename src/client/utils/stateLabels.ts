import type { SnField } from './fields'

/**
 * sys_audit stores choice fields as raw codes ('-2', '1') with no display
 * value, so feed rendering needs its own label maps. Values verified against
 * dev421992 sys_choice (change_request.state, change_task.state, task.approval).
 */
export const CHANGE_STATE_LABELS: Record<string, string> = {
  '-5': 'New',
  '-4': 'Assess',
  '-3': 'Authorize',
  '-2': 'Scheduled',
  '-1': 'Implement',
  '0': 'Review',
  '3': 'Closed',
  '4': 'Canceled',
}

export const TASK_STATE_LABELS: Record<string, string> = {
  '-5': 'Pending',
  '1': 'Open',
  '2': 'In Progress',
  '3': 'Closed',
  '4': 'Canceled',
}

export const APPROVAL_LABELS: Record<string, string> = {
  'not requested': 'Not Yet Requested',
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
}

/**
 * Wrap an audit code as the { value, display_value } shape the badge
 * components expect, so StateBadge/TaskStateBadge render audit transitions
 * with the same validated status palette as live records.
 */
export function asStateField(table: 'change_request' | 'change_task', code: string): SnField {
  const labels = table === 'change_request' ? CHANGE_STATE_LABELS : TASK_STATE_LABELS
  return { value: code, display_value: labels[code] ?? code }
}
