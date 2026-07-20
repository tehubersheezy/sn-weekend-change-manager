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

/**
 * A task_ci (affected CI) row. task_ci.task holds the change_request sys_id
 * directly. CI attributes are dot-walked through ci_item and arrive under
 * dotted keys, exactly as sent in sysparm_fields.
 */
export interface AffectedCiRecord {
  sys_id: SnField
  /** Reference to cmdb_ci — display_value is the CI name. */
  ci_item: SnField
  'ci_item.sys_class_name': SnField
  'ci_item.operational_status': SnField
  /**
   * The CHANGE this CI is affected by (task_ci.task holds the change_request
   * sys_id, not a change_task — see ChangeService.listAffectedCis).
   *
   * Only populated by listWeekendAffectedCis, which fetches many changes' CIs in
   * one query and therefore has to carry the grouping key. The per-change read
   * already filters on task=<sys_id>, so it has nothing to group by and omits it.
   */
  task?: SnField
}

/** A change_task row. */
export interface TaskRecord {
  sys_id: SnField
  number: SnField
  short_description: SnField
  state: SnField
  /** change_task_type — Planning / Implementation / Testing / Review; often empty. */
  change_task_type: SnField
  assigned_to: SnField
  planned_start_date: SnField
  planned_end_date: SnField
  change_request: SnField
  /** Jira issue key (e.g. NET-4821). */
  correlation_display: SnField
  /** Only populated by ChangeService.getTask — the window-wide task query
      deliberately skips it (242 rows × a text blob nobody reads in a list). */
  description?: SnField
}
