import type { SnField } from '../utils/fields'
import { tableQuery } from './tableApi'

/** A sys_user row, limited to what the person page shows. */
export interface UserRecord {
  sys_id: SnField
  name: SnField
  title: SnField
}

const USER_FIELDS = ['sys_id', 'name', 'title'].join(',')

/**
 * sys_user reads for the person detail page. Results are cached by sys_id for
 * the life of the app: names and titles don't move on a weekend timescale, and
 * the same person is often opened repeatedly (grid badge, task row, re-open).
 */
export class UserService {
  private cache = new Map<string, Promise<UserRecord | null>>()

  getUser(sysId: string): Promise<UserRecord | null> {
    const cached = this.cache.get(sysId)
    if (cached) return cached
    const params = new URLSearchParams({
      sysparm_fields: USER_FIELDS,
      sysparm_query: `sys_id=${sysId}`,
    })
    const request = tableQuery<UserRecord>('sys_user', params)
      .then((rows) => rows[0] ?? null)
      .catch((err) => {
        // A failed lookup shouldn't poison the cache — let a retry refetch.
        this.cache.delete(sysId)
        throw err
      })
    this.cache.set(sysId, request)
    return request
  }
}
