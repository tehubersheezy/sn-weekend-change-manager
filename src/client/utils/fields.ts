/**
 * ServiceNow Table API returns fields as { value, display_value } objects when
 * sysparm_display_value=all. These helpers read either shape defensively — some
 * responses (or nested references) may hand back a plain string instead.
 */
export interface SnField {
  value: string
  display_value: string
}

export type SnValue = SnField | string | null | undefined

/** Human-facing text — prefers display_value, falls back to value / raw string. */
export function display(field: SnValue): string {
  if (field == null) return ''
  if (typeof field === 'string') return field
  return field.display_value || field.value || ''
}

/** Raw stored value — for state codes, sys_ids, query keys. */
export function value(field: SnValue): string {
  if (field == null) return ''
  if (typeof field === 'string') return field
  return field.value || ''
}
