import '@servicenow/sdk/global'
import { Property, RestApi } from '@servicenow/sdk/core'
import { resolveIssues } from '../server/jira'

/**
 * Ships with the app so the endpoint exists on install; an admin sets the value
 * per instance. Empty is a valid state — the console then renders Jira keys as
 * plain text rather than dead links.
 *
 * NB Fluent parses this file rather than running it: every value here must be a
 * literal. Even a two-part string concatenation fails to parse.
 */
Property({
    $id: Now.ID['jira-base-url-property'],
    name: 'x_912401_weekend_c.jira_base_url',
    type: 'string',
    value: '',
    description:
        'Base URL of the Jira instance, e.g. https://acme.atlassian.net. The Weekend Change Console resolves change-task Jira keys against this. Empty disables Jira links.',
})

/**
 * GET /api/x_912401_weekend_c/jira/issues?keys=NET-4821,DB-118
 *
 * The console's only Jira surface. It hands over issue keys (which ride on
 * change_task.correlation_display) and gets back links, so the base URL — and
 * the credentials a live Jira callout would need — never reach the browser.
 * Authenticated by default; the route exposes nothing but the configured host.
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
            script: resolveIssues,
            shortDescription: 'Resolve Jira issue keys into browse links.',
            parameters: [
                {
                    $id: Now.ID['jira-rest-issues-keys'],
                    name: 'keys',
                    required: true,
                    exampleValue: 'NET-4821,DB-118',
                    shortDescription: 'Comma-separated Jira issue keys.',
                },
            ],
        },
    ],
})
