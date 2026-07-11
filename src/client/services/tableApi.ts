/**
 * Shared Table API GET. Every read in the app goes through here: X-UserToken
 * from the page's g_ck, sysparm_display_value=all so fields arrive as
 * { value, display_value } pairs (see utils/fields.ts).
 */
export async function tableQuery<T>(table: string, params: URLSearchParams): Promise<T[]> {
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

/**
 * Split a sys_id list into IN-clause chunks. ServiceNow accepts long encoded
 * queries, but a weekend of 100+ changes puts several KB of sys_ids into one
 * GET URL — chunking keeps each request comfortably inside URL limits.
 */
export function chunkIds(ids: string[], size = 80): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size))
  return chunks
}
