import type { SnField } from './utils/fields'

/** A change_request row as returned with sysparm_display_value=all. */
export interface ChangeRecord {
  sys_id: SnField
  number: SnField
  short_description: SnField
  description: SnField
  state: SnField
  type: SnField
  risk: SnField
  priority: SnField
  assignment_group: SnField
  assigned_to: SnField
  /** Planned start/end — change_request stores these in start_date/end_date. */
  start_date: SnField
  end_date: SnField
  justification: SnField
  implementation_plan: SnField
  backout_plan: SnField
  test_plan: SnField
  close_notes: SnField
  close_code: SnField
}

/** A change_task row. */
export interface TaskRecord {
  sys_id: SnField
  number: SnField
  short_description: SnField
  state: SnField
  assigned_to: SnField
  planned_start_date: SnField
  planned_end_date: SnField
  change_request: SnField
  /** Jira issue key (e.g. NET-4821). */
  correlation_display: SnField
}
