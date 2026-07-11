import type { ChangeRecord, TaskRecord } from '../types'
import type { WeekendWindow } from '../utils/weekendWindow'

const CHANGE_FIELDS = [
  'sys_id',
  'number',
  'short_description',
  'description',
  'state',
  'type',
  'risk',
  'priority',
  'assignment_group',
  'assigned_to',
  'start_date',
  'end_date',
  'justification',
  'implementation_plan',
  'backout_plan',
  'test_plan',
  'close_notes',
  'close_code',
].join(',')

const TASK_FIELDS = [
  'sys_id',
  'number',
  'short_description',
  'state',
  'assigned_to',
  'planned_start_date',
  'planned_end_date',
  'change_request',
  // Jira issue key lives in correlation_display.
  'correlation_display',
].join(',')

/**
 * Encoded query for change_request rows overlapping the window. Shared by the
 * Table API list call and the AMB record-watcher channel so both see the same
 * population.
 */
export function weekendChangeQuery(window: WeekendWindow): string {
  // change_request's planned dates live in start_date/end_date (their LABELS
  // are "Planned start/end date" — planned_start_date does not exist on this
  // table, and ServiceNow silently drops invalid query terms, which returns
  // every change in the instance). change_task, confusingly, DOES use
  // planned_start_date/planned_end_date. Canceled (4) and New (-5) changes are
  // excluded — canceled isn't weekend workload, and New hasn't been assessed
  // into the window yet.
  return `start_date<=${window.endUtc}^end_date>=${window.startUtc}^state!=4^state!=-5`
}

/**
 * Encoded query for change_task rows belonging to the weekend. A task's OWN
 * planned_start_date/planned_end_date are frequently empty, so we can't window
 * on them — a task belongs to the weekend iff its parent change_request does.
 * Dot-walk through the change_request reference and apply the exact parent
 * predicate from weekendChangeQuery. One call, no fan-out over parent sys_ids.
 */
export function weekendTaskQuery(window: WeekendWindow): string {
  return (
    `change_request.start_date<=${window.endUtc}` +
    `^change_request.end_date>=${window.startUtc}` +
    `^change_request.state!=4^change_request.state!=-5`
  )
}

/**
 * Reads change_request records overlapping the weekend window plus their
 * change_task children. All calls go through the Table API with an X-UserToken
 * header and sysparm_display_value=all (fields arrive as {value, display_value}).
 */
export class ChangeService {
  private async query<T>(table: string, params: URLSearchParams): Promise<T[]> {
    params.set('sysparm_display_value', 'all')
    const response = await fetch(`/api/now/table/${table}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-UserToken': window.g_ck,
      },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP error ${response.status}`)
    }
    const { result } = await response.json()
    return (result as T[]) || []
  }

  /** change_request rows overlapping the window, ordered by planned start. */
  async listWeekendChanges(window: WeekendWindow): Promise<ChangeRecord[]> {
    const q = `${weekendChangeQuery(window)}^ORDERBYstart_date`
    const params = new URLSearchParams({ sysparm_fields: CHANGE_FIELDS, sysparm_query: q })
    return this.query<ChangeRecord>('change_request', params)
  }

  /** A single change_request by sys_id. */
  async getChange(sysId: string): Promise<ChangeRecord | null> {
    const params = new URLSearchParams({
      sysparm_fields: CHANGE_FIELDS,
      sysparm_query: `sys_id=${sysId}`,
    })
    const rows = await this.query<ChangeRecord>('change_request', params)
    return rows[0] ?? null
  }

  /** change_task rows for one change, ordered by planned start. */
  async listTasksForChange(changeSysId: string): Promise<TaskRecord[]> {
    const params = new URLSearchParams({
      sysparm_fields: TASK_FIELDS,
      sysparm_query: `change_request=${changeSysId}^ORDERBYplanned_start_date`,
    })
    return this.query<TaskRecord>('change_task', params)
  }

  /** All change_task rows whose planned window overlaps the weekend — one call. */
  async listWeekendTasks(window: WeekendWindow): Promise<TaskRecord[]> {
    const params = new URLSearchParams({
      sysparm_fields: TASK_FIELDS,
      sysparm_query: `${weekendTaskQuery(window)}^ORDERBYplanned_start_date`,
    })
    return this.query<TaskRecord>('change_task', params)
  }
}
