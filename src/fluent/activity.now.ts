import '@servicenow/sdk/global'
import { CrossScopePrivilege, RestApi } from '@servicenow/sdk/core'
import { weekendActivity } from '../server/activity'

/**
 * GET /api/x_912401_weekend_c/activity/events?from=<utc>&to=<utc>
 *
 * The weekend activity feed. It lives on the server because the browser cannot
 * build it: ITIL users — the console's actual audience — get 403 on sys_audit and
 * a silent zero rows on sys_journal_field. See src/server/activity.ts for the
 * full account and for why the GlideRecordSecure-then-GlideRecord ordering is
 * what keeps the ACL bypass sound.
 *
 * The route's auth flags are deliberately left at Fluent's defaults, matching the
 * Jira route: requires_authentication, requires_acl_authorization and
 * requires_snc_internal_role all true, with enforce_acl inheriting the OOB
 * "Scripted REST External Default" ACL (`answer = !gs.hasRole('snc_external')`).
 * That admits any internal user, which is exactly right here — verified against
 * dev421992 by calling the deployed Jira route as an itil-only user (HTTP 200).
 *
 * NB Fluent PARSES this file rather than running it: every value must be a
 * literal. Even a two-part string concatenation fails to parse.
 */
RestApi({
    $id: Now.ID['activity-rest-api'],
    name: 'Weekend Console Activity',
    serviceId: 'activity',
    produces: 'application/json',
    routes: [
        {
            $id: Now.ID['activity-rest-events'],
            name: 'events',
            method: 'GET',
            path: '/events',
            script: weekendActivity,
            shortDescription:
                'Comments, work notes, state and approval transitions across the weekend window.',
            parameters: [
                {
                    $id: Now.ID['activity-rest-events-from'],
                    name: 'from',
                    required: true,
                    exampleValue: '2026-07-10 21:00:00',
                    shortDescription: "Window start, UTC 'YYYY-MM-DD HH:MM:SS'.",
                },
                {
                    $id: Now.ID['activity-rest-events-to'],
                    name: 'to',
                    required: true,
                    exampleValue: '2026-07-13 03:59:59',
                    shortDescription: "Window end, UTC 'YYYY-MM-DD HH:MM:SS'.",
                },
            ],
        },
    ],
})

/**
 * Cross-scope read grants for the tables src/server/activity.ts touches.
 *
 * These MUST ship with the app. ServiceNow auto-creates sys_scope_privilege rows
 * only while an application is in development — once it is published, "the system
 * only allows runtime requests to run that have a valid cross-scope privilege
 * record". Relying on dev-time auto-tracking gives you a feed that works on the
 * instance it was built on and 403s on a fresh install.
 *
 * Every one of these is READ. The app has no business writing to any of them, and
 * the target tables' sys_db_object rows only permit cross-scope read anyway
 * (read_access true, create_access false) — a privilege can never exceed that.
 *
 * change_request and change_task are here too: the console has always read them
 * from the browser via the Table API (as the user, no cross-scope involved), but
 * this route is the app's first SERVER-side access to them.
 */
CrossScopePrivilege({
    $id: Now.ID['xscope-read-change-request'],
    operation: 'read',
    status: 'allowed',
    targetName: 'change_request',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

CrossScopePrivilege({
    $id: Now.ID['xscope-read-change-task'],
    operation: 'read',
    status: 'allowed',
    targetName: 'change_task',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

/** The table an ITIL user gets a silent zero rows from. */
CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys-journal-field'],
    operation: 'read',
    status: 'allowed',
    targetName: 'sys_journal_field',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

/** The table an ITIL user gets a 403 from. */
CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys-audit'],
    operation: 'read',
    status: 'allowed',
    targetName: 'sys_audit',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

/** Journal/audit authors are username strings, not references — resolved here. */
CrossScopePrivilege({
    $id: Now.ID['xscope-read-sys-user'],
    operation: 'read',
    status: 'allowed',
    targetName: 'sys_user',
    targetScope: 'global',
    targetType: 'sys_db_object',
})
