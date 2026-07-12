import '@servicenow/sdk/global'
import { RestApi } from '@servicenow/sdk/core'
import { getIssue, listIssues } from '../server/jira'

/**
 * The console's Jira API.
 *
 * Change tasks name Jira issues (the key rides on change_task.correlation_display),
 * and these two routes turn those keys into issues the console can RENDER — a
 * weekend operator reads the ticket behind a task without leaving the console and
 * without a Jira account.
 *
 * This REPLACES a route that resolved keys into Jira browse URLs, and the
 * `x_912401_weekend_c.jira_base_url` property that fed it is deliberately gone
 * with it. Linking out was the wrong capability — it knew a key existed and then
 * handed the user off — and a property an admin can set that changes nothing is
 * worse than no property at all. Removing it here removes it from the instance
 * on the next install.
 *
 * There is no Jira attached to this instance, so the ISSUE half of the payload is
 * mock (fixtures in src/server/jira.ts). The REFERENCES half — which weekend
 * change tasks name this issue — is real, live, and ACL-checked. See that file's
 * header for the seam, and for where a live Jira callout would slot in.
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
        },
    ],
})
