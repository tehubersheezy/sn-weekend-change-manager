import { chunkIds } from './tableApi'

/** The scripted REST route declared in src/fluent/jira.now.ts. */
const JIRA_ENDPOINT = '/api/x_912401_weekend_c/jira/issues'

interface JiraIssueLink {
  key: string
  url: string | null
}

/**
 * Turns Jira issue keys (which ride on change_task.correlation_display) into
 * browse links by asking the app's own scripted REST API. The Jira base URL is
 * a system property the server reads — it never reaches the browser, so an
 * instance with no Jira configured simply resolves nothing and the console
 * renders bare keys.
 *
 * Links are decoration: a 404 (endpoint not deployed yet) or any other failure
 * degrades to "no link", never to a broken feed.
 */
export class JiraService {
  /** key → url, or null for "asked, and there is no link". Both are cache hits. */
  private cache = new Map<string, string | null>()

  async resolve(keys: string[]): Promise<Map<string, string>> {
    const wanted = [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
    const unresolved = wanted.filter((k) => !this.cache.has(k))

    for (const chunk of chunkIds(unresolved)) {
      try {
        for (const issue of await this.fetchChunk(chunk)) {
          this.cache.set(issue.key, issue.url || null)
        }
      } catch {
        /* fall through — the loop below caches the whole chunk as unlinkable */
      }
      // Anything the server didn't answer for is settled as "no link", so a
      // dead endpoint costs one request per key set rather than one per render.
      for (const key of chunk) if (!this.cache.has(key)) this.cache.set(key, null)
    }

    const links = new Map<string, string>()
    for (const key of wanted) {
      const url = this.cache.get(key)
      if (url) links.set(key, url)
    }
    return links
  }

  private async fetchChunk(keys: string[]): Promise<JiraIssueLink[]> {
    const params = new URLSearchParams({ keys: keys.join(',') })
    const response = await fetch(`${JIRA_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-UserToken': window.g_ck },
    })
    if (!response.ok) throw new Error(`HTTP error ${response.status}`)
    const body = await response.json()
    // Scripted REST bodies come through raw from response.setBody(); platform
    // versions that wrap them in `result` are handled by the same read.
    return (body?.result?.issues ?? body?.issues ?? []) as JiraIssueLink[]
  }
}
