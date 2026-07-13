import '@servicenow/sdk/global'
import { RestApi } from '@servicenow/sdk/core'
import { getIssue, listIssues } from '../server/jira'

/**
 * The console's Jira API.
 *
 * Change tasks name Jira issues (the key rides on change_task.correlation_display),
 * and these two routes turn those keys into issues the console can RENDER — a
 * weekend operator reads the ticket behind a task without leaving the console and
 * without a Jira account. Each route answers with an `issue` from Jira and the
 * `references` from this instance, side by side: which weekend change tasks depend
 * on this issue is the question the real Jira page cannot answer, and it is the
 * reason the surface exists.
 *
 * This REPLACES a route that resolved keys into Jira browse URLs, and the
 * `x_912401_weekend_c.jira_base_url` property that fed it is deliberately gone
 * with it (removing it here removes it from the instance on the next install).
 * Linking out was the wrong capability — it knew a key existed and then handed
 * the user off.
 *
 * CONFIG ARRIVES ON THE REQUEST, NOT FROM THE INSTANCE. Each route reads two
 * headers — X-Jira-Url and X-Jira-Token (a personal access token, sent on to Jira
 * as Bearer auth) — declared below so they show up in the API explorer. They are
 * owned by the console's Settings dialog and live in the operator's browser: no
 * system property, no credential record, nothing on the instance for an admin to
 * set on everyone else's behalf. Headers and not query params, because a token in
 * a query string is written to the transaction log, the proxy access log, and
 * browser history. Without them the routes serve the fixtures in src/server/jira.ts,
 * which is what keeps the demo working on an instance with no Jira attached.
 *
 * Auth flags stay at Fluent's defaults, matching the activity route:
 * requires_authentication, requires_acl_authorization and requires_snc_internal_role
 * all true, with enforce_acl inheriting the OOB "Scripted REST External Default"
 * ACL. That admits any internal user, which is right — the routes read change data
 * through GlideRecordSecure, so a caller sees exactly what they could already see.
 *
 * NB Fluent PARSES this file rather than running it: every value must be a
 * literal. Even a two-part string concatenation fails to parse.
 */
RestApi({
    $id: Now.ID['jira-rest-api'],
    name: 'Weekend Console Jira',
    serviceId: 'jira',
    produces: 'application/json',
    routes: [
        {
            $id: Now.ID['jira-rest-issues'],
            name: 'issues',
            method: 'GET',
            path: '/issues',
            script: listIssues,
            shortDescription:
                'Batch issue summaries for a set of Jira keys — lists and badges.',
            parameters: [
                {
                    $id: Now.ID['jira-rest-issues-keys'],
                    name: 'keys',
                    required: true,
                    exampleValue: 'NET-4451,SEC-3319',
                    shortDescription: 'Comma-separated Jira issue keys.',
                },
            ],
            headers: [
                {
                    $id: Now.ID['jira-rest-issues-url-header'],
                    name: 'X-Jira-Url',
                    required: false,
                    exampleValue: 'https://jira.example.com',
                    shortDescription:
                        'Jira base URL. Omit it (with the token) to serve fixtures instead.',
                },
                {
                    $id: Now.ID['jira-rest-issues-token-header'],
                    name: 'X-Jira-Token',
                    required: false,
                    exampleValue: 'a Jira personal access token',
                    shortDescription:
                        'Jira personal access token, sent on to Jira as Bearer auth. Never a query param.',
                },
            ],
        },
        {
            $id: Now.ID['jira-rest-issue'],
            name: 'issue',
            method: 'GET',
            path: '/issue',
            script: getIssue,
            shortDescription:
                'One Jira issue, plus the weekend change tasks that reference it.',
            parameters: [
                {
                    $id: Now.ID['jira-rest-issue-key'],
                    name: 'key',
                    required: true,
                    exampleValue: 'NET-4451',
                    shortDescription: 'A single Jira issue key.',
                },
            ],
            headers: [
                {
                    $id: Now.ID['jira-rest-issue-url-header'],
                    name: 'X-Jira-Url',
                    required: false,
                    exampleValue: 'https://jira.example.com',
                    shortDescription:
                        'Jira base URL. Omit it (with the token) to serve fixtures instead.',
                },
                {
                    $id: Now.ID['jira-rest-issue-token-header'],
                    name: 'X-Jira-Token',
                    required: false,
                    exampleValue: 'a Jira personal access token',
                    shortDescription:
                        'Jira personal access token, sent on to Jira as Bearer auth. Never a query param.',
                },
            ],
        },
    ],
})
