import type { TaskRecord } from '../types'
import { display, value } from './fields'

export interface Progress {
  done: number
  total: number
}

/** Task completion for a change — a task counts as done once it reaches a Closed state. */
export function taskProgress(tasks: TaskRecord[]): Progress {
  const done = tasks.filter((t) => display(t.state).toLowerCase().includes('closed')).length
  return { done, total: tasks.length }
}

/** Group tasks by their parent change_request sys_id. */
export function groupTasksByChange(tasks: TaskRecord[]): Map<string, TaskRecord[]> {
  const map = new Map<string, TaskRecord[]>()
  for (const t of tasks) {
    const key = value(t.change_request)
    const list = map.get(key)
    if (list) list.push(t)
    else map.set(key, [t])
  }
  return map
}
