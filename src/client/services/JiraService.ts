import { chunkIds } from './tableApi'

/** The scoped scripted REST routes declared in src/fluent/jira.now.ts. */
const ISSUES_ENDPOINT = '/api/x_912401_weekend_c/jira/issues'
const ISSUE_ENDPOINT = '/api/x_912401_weekend_c/jira/issue'

/** Jira's three status buckets. Every status label falls into exactly one. */
export type JiraStatusCategory = 'todo' | 'in-progress' | 'done'

export interface JiraComment {
  id: string
  author: string
  /** ServiceNow UTC datetime — parse with parseSnDate, like every other date here. */
  when: string
  body: string
}

/**
 * A change task in THIS console that names the issue, joined to its parent change.
 *
 * This is the one part of the payload that is NOT mock — the server reads it live
 * from change_task/change_request. `changeSysId` is empty when the caller can't
 * read the parent change; render the task without a change link in that case.
 *
 * `taskState` and `changeState` are RAW CHOICE CODES ('2', '-2'), not labels —
 * pass them through asStateField() so StateBadge/TaskStateBadge pick the right
 * variant. A label here would render every badge in the neutral fallback colour
 * and nothing would error.
 */
export interface JiraReference {
  taskSysId: string
  taskNumber: string
  taskShortDescription: string
  taskState: string
  changeSysId: string
  changeNumber: string
  changeShortDescription: string
  changeState: string
}

/** Enough of an issue to render a list row or a badge. */
export interface JiraIssueSummary {
  key: string
  summary: string
  type: string
  status: string
  statusCategory: JiraStatusCategory
  priority: string
  assignee: string
}

/** Everything the detail surface renders. */
export interface JiraIssueDetail extends JiraIssueSummary {
  projectKey: string
  projectName: string
  description: string
  reporter: string
  epic: string
  sprint: string
  labels: string[]
  storyPoints: number | null
  created: string
  updated: string
  resolution: string
  comments: JiraComment[]
}

/**
 * One issue lookup. `issue` and `references` are siblings, not nested, because
 * they come from different systems: the issue is Jira's, the references are
 * ServiceNow's. Either can be present without the other — an unknown key is a
 * successful lookup with issue: null and its references intact.
 */
export interface JiraIssueResult {
  key: string
  issue: JiraIssueDetail | null
  references: JiraReference[]
}

/**
 * Reads Jira issues through the app's own scoped REST API.
 *
 * The console never talks to Jira. It asks its own scope, which owns both halves
 * of the answer — see src/server/jira.ts for which half is mock and which is live.
 *
 * The two calls fail differently ON PURPOSE. Summaries are decoration: a list row
 * that can't fetch one still shows its key, so a dead endpoint degrades the badges
 * and nothing else. The detail payload IS the page, so getIssue throws and the
 * view renders an error — silently showing an empty issue would be a lie.
 */
/**
 * Where to reach Jira, and with what. Configured in the console's Settings dialog.
 *
 * The console still never talks to Jira — it hands these to its own scope, which
 * makes the callout. A browser cannot reach a corporate Jira behind the VPN, and
 * even where it could the CORS preflight would fail, so routing through the
 * instance is not a preference, it is the only thing that works.
 *
 * Empty config is a valid, supported state: the route falls back to its fixtures.
 */
export interface JiraConfig {
  baseUrl: string
  token: string
}

export class JiraService {
  /** key → summary, or null for "asked, and there is no such issue". Both are cache hits. */
  private summaries = new Map<string, JiraIssueSummary | null>()

  /**
   * The cache is per-instance and the caller rebuilds this service when the config
   * changes, so a key resolved against the OLD Jira can never survive into the new
   * one — which is exactly what you want the moment someone fixes a typo'd URL.
   */
  constructor(private readonly config: JiraConfig = { baseUrl: '', token: '' }) {}

  /**
   * Batch summaries for the keys on screen. Cached across renders and shared by
   * the activity feed and the detail pane's Jiras tab, so a key resolves once.
   */
  async listSummaries(keys: string[]): Promise<Map<string, JiraIssueSummary>> {
    const wanted = [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
    const unresolved = wanted.filter((k) => !this.summaries.has(k))

    for (const chunk of chunkIds(unresolved)) {
      try {
        for (const issue of await this.fetchChunk(chunk)) {
          this.summaries.set(issue.key, issue)
        }
      } catch {
        /* fall through — the loop below settles the whole chunk as unknown */
      }
      // Anything the server didn't answer for is settled as "no such issue", so a
      // dead endpoint costs one request per key set rather than one per render.
      for (const key of chunk) if (!this.summaries.has(key)) this.summaries.set(key, null)
    }

    const found = new Map<string, JiraIssueSummary>()
    for (const key of wanted) {
      const summary = this.summaries.get(key)
      if (summary) found.set(key, summary)
    }
    return found
  }

  /**
   * One issue and its live ServiceNow references. Never cached: the references
   * are real records that move during a weekend, and the detail view refetches
   * them when its AMB watcher fires.
   */
  async getIssue(key: string): Promise<JiraIssueResult> {
    const params = new URLSearchParams({ key })
    const body = await this.get(`${ISSUE_ENDPOINT}?${params.toString()}`)
    const result = body?.result ?? body
    return {
      key: result?.key ?? key,
      issue: (result?.issue ?? null) as JiraIssueDetail | null,
      references: (result?.references ?? []) as JiraReference[],
    }
  }

  private async fetchChunk(keys: string[]): Promise<JiraIssueSummary[]> {
    const params = new URLSearchParams({ keys: keys.join(',') })
    const body = await this.get(`${ISSUES_ENDPOINT}?${params.toString()}`)
    return (body?.result?.issues ?? body?.issues ?? []) as JiraIssueSummary[]
  }

  /**
   * The Jira connection, forwarded to our own scope as HEADERS.
   *
   * Headers rather than query params, deliberately: a token in a query string is
   * written into the ServiceNow transaction log, the front proxy's access log and
   * the browser's history. A header is in none of those.
   *
   * Omitted entirely when unconfigured, so the route sees "no Jira" rather than a
   * pair of empty strings it has to interpret.
   */
  private jiraHeaders(): Record<string, string> {
    const baseUrl = this.config.baseUrl.trim()
    const token = this.config.token.trim()
    if (!baseUrl || !token) return {}
    return { 'X-Jira-Url': baseUrl, 'X-Jira-Token': token }
  }

  private async get(url: string): Promise<any> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-UserToken': window.g_ck,
        ...this.jiraHeaders(),
      },
    })
    if (!response.ok) throw new Error(`HTTP error ${response.status}`)
    // Scripted REST bodies come through raw from response.setBody(); platform
    // versions that wrap them in `result` are handled by the callers' reads.
    return response.json()
  }
}
