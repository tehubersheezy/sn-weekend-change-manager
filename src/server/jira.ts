import { gs } from '@servicenow/glide'

/**
 * Base URL of the Jira instance, e.g. https://acme.atlassian.net. Read here and
 * nowhere else: the console never sees this property. It posts issue keys to the
 * scripted REST route below and gets links back, which keeps instance config —
 * and any Jira credentials a real callout would need — server-side.
 */
const BASE_URL_PROPERTY = 'x_912401_weekend_c.jira_base_url'

/** Jira issue keys look like NET-4821. Anything else we refuse to build a link for. */
const KEY_PATTERN = /^[A-Z][A-Z0-9_]*-[0-9]+$/

interface JiraIssueLink {
    key: string
    /** Browse URL, or null when the instance has no Jira base URL configured. */
    url: string | null
}

/**
 * Read a scripted-REST query param as a plain string. ServiceNow hands back an
 * array of values per param (`?keys=A,B` arrives as `['A,B']`), so a naive
 * string read yields '' and the route silently resolves nothing.
 */
function queryParam(request: any, name: string): string {
    const params = request && request.queryParams
    if (!params) return ''
    const raw = params[name]
    if (raw === undefined || raw === null) return ''
    if (typeof raw === 'string') return raw
    if (typeof raw.join === 'function') return raw.join(',')
    return String(raw)
}

/**
 * GET /api/x_912401_weekend_c/jira/issues?keys=NET-4821,DB-118
 *
 * Resolves Jira issue keys into browse links for the Weekend Change Console.
 * Unconfigured base URL or an unrecognizable key yields url: null rather than a
 * broken href — the console renders those keys as plain text.
 */
export function resolveIssues(request: any, response: any): void {
    const baseUrl = String(gs.getProperty(BASE_URL_PROPERTY, '') || '')
        .trim()
        .replace(/\/+$/, '')

    const seen: { [key: string]: boolean } = {}
    const issues: JiraIssueLink[] = []
    const requested = queryParam(request, 'keys').split(',')

    for (let i = 0; i < requested.length; i++) {
        const key = requested[i].trim()
        if (!key || seen[key]) continue
        seen[key] = true
        const linkable = baseUrl !== '' && KEY_PATTERN.test(key)
        issues.push({ key, url: linkable ? baseUrl + '/browse/' + key : null })
    }

    response.setBody({ baseUrl: baseUrl || null, issues })
}
