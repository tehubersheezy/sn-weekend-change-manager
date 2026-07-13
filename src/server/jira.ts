import { GlideRecordSecure, gs } from '@servicenow/glide'
import { RESTMessageV2 } from '@servicenow/glide/sn_ws'

/**
 * The console's Jira surface, served from the app's own scope.
 *
 * WHAT THIS IS. Change tasks name Jira issues — the key rides on
 * change_task.correlation_display (e.g. NET-4451). These routes turn those keys
 * into issues the console can RENDER, so a weekend operator can read the ticket
 * behind a task without leaving the console and without a Jira account.
 *
 * They replace an earlier route that resolved keys into Jira BROWSE URLS. That
 * was the wrong capability: it knew a key existed and then handed the user off.
 *
 * TWO SOURCES, AND THE SEAM BETWEEN THEM IS THE POINT.
 *
 *   The ISSUE comes from Jira, over an outbound callout made by this route.
 *   The REFERENCES come from this instance. They are siblings on the wire, never
 *   nested, because they are answers from two different systems and either can be
 *   present without the other. readReferences() queries change_task for the key
 *   and joins the parent change — live, ACL-checked, no fixtures. "Which weekend
 *   change tasks depend on this issue" is a question the real Jira page CANNOT
 *   answer, and it is the entire reason a Jira page exists inside this console.
 *
 * An unrecognized key is NOT an error: it answers issue: null with its references
 * intact, and the console says so. A key that Jira does not have is still a key a
 * change task is depending on, which is worth showing.
 *
 * WHERE THE CONFIG LIVES: THE REQUEST, NOT THE INSTANCE. The Jira base URL and a
 * personal access token arrive on every call as request HEADERS —
 *
 *   X-Jira-Url     https://jira.example.com   (trailing slash tolerated)
 *   X-Jira-Token   a Jira personal access token, sent on as Bearer auth
 *
 * — because the console's Settings dialog owns them and keeps them in the
 * operator's browser. Nothing is stored on the instance: no system property, no
 * credential record, nothing for an admin to set and nothing for the next person
 * to inherit. (A `jira_base_url` property once existed for the link-out route and
 * is deliberately deleted; config that only an admin can change was the wrong
 * shape for a surface each operator points at their own Jira.) They are HEADERS
 * and not query params on purpose — a token in a query string is written to the
 * ServiceNow transaction log, the front proxy's access log, and browser history.
 *
 * PATs mean Jira Data Center / Server, so this calls REST API **v2**. Not v3:
 * that is Cloud-only and returns descriptions and comment bodies as ADF
 * (Atlassian Document Format) JSON rather than the plain strings these interfaces
 * — and the console's renderer — are built on.
 *
 * NO HEADERS, NO CALLOUT. With either header missing, both routes fall back to
 * the ISSUES fixtures below. dev421992 has no Jira attached, so the fixtures are
 * what keeps the deployed demo honest and working when nothing is configured;
 * they are hand-authored against the 20 real keys the seeded change tasks carry,
 * so their statuses track their tasks. Configured-but-broken is NOT the same
 * thing and never falls back — see getIssue/listIssues for how each fails.
 *
 * DIALECT. This file stays inside the same conservative ES5 subset as
 * src/server/activity.ts: no arrow functions, no template literals, no spread,
 * no destructuring, no Array.prototype.includes/find. ServiceNow's server engine
 * is not guaranteed to be the modern one, a syntax error here would not surface
 * until install, and there is no local harness that would catch it first.
 */

/** Most change tasks we will join onto one issue. Far above any real fan-out. */
const REFERENCE_LIMIT = 50

/** Jira issue keys look like NET-4451. Anything else we refuse to look up. */
const KEY_PATTERN = /^[A-Z][A-Z0-9_]*-[0-9]+$/

/** Most keys one batch call will resolve. The console asks per visible screen. */
const BATCH_LIMIT = 100

/** A configured base URL has to be absolute — we concatenate a path onto it. */
const ABSOLUTE_URL = /^https?:\/\/[^\s]+$/

/** Jira DC's REST API. v2 (not v3) because a PAT means Data Center — see the header. */
const JIRA_API = '/rest/api/2'

/** Outbound call ceiling. A weekend operator waits on this synchronously. */
const HTTP_TIMEOUT_MS = 15000

/** The only fields a summary needs. Asking for more would just cost payload. */
const SUMMARY_FIELDS = 'summary,issuetype,status,priority,assignee'

/**
 * A summary, plus the two fields nothing on screen renders and the AI report
 * cannot do without: the description and the comment thread.
 *
 * These ride on the SAME JQL search rather than N calls to /issue — Jira returns
 * `description` and `comment` as ordinary fields, so a whole weekend's issues
 * still cost one callout. That is the only reason this is affordable at all: a
 * per-key fan-out for twenty issues inside one synchronous scripted-REST
 * transaction is how you turn a report into a timeout.
 *
 * Opt-in (`?detail=full`) because the list surfaces must NOT pay for it. A badge
 * row does not want a comment thread over the wire, and the report is opened
 * rarely.
 */
const REPORT_FIELDS = SUMMARY_FIELDS + ',description,comment'

type JiraStatusCategory = 'todo' | 'in-progress' | 'done'

/** Per-request Jira config, read off the headers. Absent config is not an error. */
interface JiraConfig {
    /** Absolute, no trailing slash. */
    baseUrl: string
    token: string
}

/** The outcome of one callout, flattened so callers never touch RESTMessageV2. */
interface JiraHttpResult {
    /** The HTTP status Jira answered with, or 0 when the call never got there. */
    status: number
    /** Parsed JSON body on a 2xx, else null. */
    data: any
    /** Empty on success. Never contains the token. */
    error: string
}

/** A Jira comment. `when` is a ServiceNow UTC datetime so the client can parse it. */
interface JiraComment {
    id: string
    author: string
    when: string
    body: string
}

/**
 * A change task in THIS console that names the issue, joined to its parent
 * change. Real data — the one part of the payload that is not mock.
 *
 * The two state fields carry RAW CHOICE CODES ('-2', '2'), not display labels.
 * The client already owns the code -> label -> badge-variant mapping in
 * utils/stateLabels.ts (sys_audit forced it to, for the activity feed), and its
 * StateBadge switches on the code. Sending labels here would render every change
 * badge in the neutral fallback colour with no error to show for it.
 */
interface JiraReference {
    taskSysId: string
    taskNumber: string
    taskShortDescription: string
    taskState: string
    changeSysId: string
    changeNumber: string
    changeShortDescription: string
    changeState: string
}

/** Enough of an issue to render a row or a badge. */
interface JiraIssueSummary {
    key: string
    summary: string
    type: string
    status: string
    statusCategory: JiraStatusCategory
    priority: string
    assignee: string
}

/**
 * What the AI report reads: a summary with the issue's own words attached.
 *
 * Deliberately NOT JiraIssueDetail. The report has no use for epic, sprint,
 * labels or story points, and every field in a batch of twenty issues is paid for
 * twice — once over the wire, once in the model's context window.
 */
interface JiraIssueNarrative extends JiraIssueSummary {
    description: string
    comments: JiraComment[]
}

/** Everything the detail surface renders. */
interface JiraIssueDetail extends JiraIssueSummary {
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

/** Jira project names, keyed by the prefix on the issue key. */
const PROJECTS: { [prefix: string]: string } = {
    DBA: 'Database Engineering',
    WIN: 'Windows Platform',
    SEC: 'Security Engineering',
    NET: 'Network Engineering',
    OPS: 'IT Operations',
}

/**
 * The mock issues, one per key the seeded change tasks carry (20 of them, 1:1).
 *
 * Authored against the real tasks: each summary describes the work its change
 * task describes, and each status tracks that task's state — the three closed
 * NET-446x tasks back three Done issues, the in-progress SEC-3319 backs an
 * In Progress issue. That coherence is what makes the surface worth looking at;
 * randomly generated fixtures would read as noise the moment you compared them
 * to the change.
 *
 * People here are JIRA users, invented, and deliberately not ServiceNow users:
 * a Jira assignee comes from Jira's own directory. (The seeded change tasks
 * have no assigned_to at all, so there was nothing to borrow even if we wanted to.)
 */
const ISSUES: JiraIssueDetail[] = [
    // ── DBA · CHG0030004 Database index rebuild (Scheduled) ───────────────────
    {
        key: 'DBA-1142',
        summary: 'Snapshot ERP reporting database before index rebuild',
        type: 'Task',
        status: 'In Progress',
        statusCategory: 'in-progress',
        priority: 'High',
        assignee: 'Priya Raghunathan',
        projectKey: 'DBA',
        projectName: 'Database Engineering',
        description:
            'Take a full snapshot of the ERP reporting database ahead of the index rebuild so we have a clean restore point. Snapshot must complete and verify before any DDL runs.\n\nRestore has to be provable, not assumed — verify the snapshot mounts read-only before signing off.',
        reporter: 'Dana Whitfield',
        epic: 'ERP reporting performance',
        sprint: 'DBA Sprint 24',
        labels: ['database', 'erp', 'pre-change'],
        storyPoints: 3,
        created: '2026-06-24 14:12:07',
        updated: '2026-07-10 18:41:33',
        resolution: '',
        comments: [
            {
                id: 'c-dba-1142-1',
                author: 'Priya Raghunathan',
                when: '2026-07-09 16:02:11',
                body: 'Snapshot job is staged against the Friday maintenance slot. Expect roughly 40 minutes at current DB size.',
            },
            {
                id: 'c-dba-1142-2',
                author: 'Dana Whitfield',
                when: '2026-07-10 18:41:33',
                body: 'Restore rehearsal on the standby passed. Good to proceed once the change window opens.',
            },
        ],
    },
    {
        key: 'DBA-1143',
        summary: 'Run index rebuild scripts against reporting schema',
        type: 'Story',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'High',
        assignee: 'Priya Raghunathan',
        projectKey: 'DBA',
        projectName: 'Database Engineering',
        description:
            'Execute the rebuild scripts for the fragmented indexes identified in the June performance review. Scripts are batched so each can be aborted independently without leaving the schema half-rebuilt.',
        reporter: 'Dana Whitfield',
        epic: 'ERP reporting performance',
        sprint: 'DBA Sprint 24',
        labels: ['database', 'erp'],
        storyPoints: 5,
        created: '2026-06-24 14:15:52',
        updated: '2026-07-08 11:20:04',
        resolution: '',
        comments: [
            {
                id: 'c-dba-1143-1',
                author: 'Priya Raghunathan',
                when: '2026-07-08 11:20:04',
                body: 'Blocked on DBA-1142 — no rebuild until the snapshot verifies.',
            },
        ],
    },
    {
        key: 'DBA-1144',
        summary: 'Update statistics and validate query plans post-rebuild',
        type: 'Task',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'Medium',
        assignee: 'Ken Nakamura',
        projectKey: 'DBA',
        projectName: 'Database Engineering',
        description:
            'Refresh statistics across the rebuilt indexes and re-run the reporting query plan baseline. Compare against the pre-change capture; any regression over 10% is a rollback trigger.',
        reporter: 'Dana Whitfield',
        epic: 'ERP reporting performance',
        sprint: 'DBA Sprint 24',
        labels: ['database', 'erp', 'validation'],
        storyPoints: 2,
        created: '2026-06-24 14:18:30',
        updated: '2026-07-02 09:47:19',
        resolution: '',
        comments: [],
    },

    // ── WIN · CHG0030014 Windows patching cycle (Scheduled) ───────────────────
    {
        key: 'WIN-2207',
        summary: 'Verify backups and checkpoints across app tier',
        type: 'Task',
        status: 'In Progress',
        statusCategory: 'in-progress',
        priority: 'High',
        assignee: 'Marcus Bell',
        projectKey: 'WIN',
        projectName: 'Windows Platform',
        description:
            'Confirm every app tier server in the July batch has a current backup and a rollback checkpoint before wave 1 patches. Any host without both is pulled from the batch.',
        reporter: 'Amara Osei',
        epic: 'July patch cycle',
        sprint: 'Platform Sprint 31',
        labels: ['patching', 'windows', 'pre-change'],
        storyPoints: 2,
        created: '2026-06-30 10:04:41',
        updated: '2026-07-10 21:15:58',
        resolution: '',
        comments: [
            {
                id: 'c-win-2207-1',
                author: 'Marcus Bell',
                when: '2026-07-10 21:15:58',
                body: 'Two hosts came back without a valid checkpoint. Pulling them from wave 1 and picking them up next cycle rather than holding the whole batch.',
            },
        ],
    },
    {
        key: 'WIN-2208',
        summary: 'Deploy July patch baseline — wave 1',
        type: 'Story',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'High',
        assignee: 'Marcus Bell',
        projectKey: 'WIN',
        projectName: 'Windows Platform',
        description:
            'Push the July cumulative baseline to the wave 1 app tier hosts. Wave 1 is the lower-criticality half of the batch and proves the baseline before wave 2 touches anything customer-facing.',
        reporter: 'Amara Osei',
        epic: 'July patch cycle',
        sprint: 'Platform Sprint 31',
        labels: ['patching', 'windows'],
        storyPoints: 5,
        created: '2026-06-30 10:07:12',
        updated: '2026-07-06 15:33:27',
        resolution: '',
        comments: [],
    },
    {
        key: 'WIN-2209',
        summary: 'Deploy July patch baseline — wave 2',
        type: 'Story',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'High',
        assignee: 'Elena Vasquez',
        projectKey: 'WIN',
        projectName: 'Windows Platform',
        description:
            'Push the July cumulative baseline to the remaining app tier hosts once wave 1 has been stable for a full hour. Gate on wave 1 validation, not on the clock.',
        reporter: 'Amara Osei',
        epic: 'July patch cycle',
        sprint: 'Platform Sprint 31',
        labels: ['patching', 'windows'],
        storyPoints: 5,
        created: '2026-06-30 10:08:55',
        updated: '2026-07-06 15:34:02',
        resolution: '',
        comments: [],
    },
    {
        key: 'WIN-2210',
        summary: 'Post-patch service validation',
        type: 'Task',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'Medium',
        assignee: 'Elena Vasquez',
        projectKey: 'WIN',
        projectName: 'Windows Platform',
        description:
            'Run the app tier smoke suite after both waves land: service start, dependency health, and the synthetic transaction set. Failures here trigger the backout on the parent change.',
        reporter: 'Amara Osei',
        epic: 'July patch cycle',
        sprint: 'Platform Sprint 31',
        labels: ['patching', 'windows', 'validation'],
        storyPoints: 3,
        created: '2026-06-30 10:10:19',
        updated: '2026-07-01 08:52:44',
        resolution: '',
        comments: [],
    },

    // ── SEC · CHG0030015 Emergency TLS certificate rotation (Implement) ───────
    {
        key: 'SEC-3318',
        summary: 'Import replacement wildcard certificate to load balancers',
        type: 'Task',
        status: 'Done',
        statusCategory: 'done',
        priority: 'Highest',
        assignee: 'Tobias Lindqvist',
        projectKey: 'SEC',
        projectName: 'Security Engineering',
        description:
            'The wildcard certificate expires this weekend. Import the replacement into both load balancer pairs ahead of the bind so the rotation itself is a config change, not a fetch.',
        reporter: 'Sam Okonkwo',
        epic: 'Certificate lifecycle',
        sprint: 'SecEng Sprint 18',
        labels: ['tls', 'certificates', 'emergency'],
        storyPoints: 2,
        created: '2026-07-08 07:31:16',
        updated: '2026-07-10 22:47:05',
        resolution: 'Done',
        comments: [
            {
                id: 'c-sec-3318-1',
                author: 'Tobias Lindqvist',
                when: '2026-07-10 22:47:05',
                body: 'Imported to both pairs and verified the chain. Bind is next — SEC-3319.',
            },
        ],
    },
    {
        key: 'SEC-3319',
        summary: 'Bind replacement certificate to external VIPs',
        type: 'Task',
        status: 'In Progress',
        statusCategory: 'in-progress',
        priority: 'Highest',
        assignee: 'Tobias Lindqvist',
        projectKey: 'SEC',
        projectName: 'Security Engineering',
        description:
            'Bind the imported certificate to every external VIP, one pair at a time, validating the served chain after each. Standby first, then failover, then the active unit.',
        reporter: 'Sam Okonkwo',
        epic: 'Certificate lifecycle',
        sprint: 'SecEng Sprint 18',
        labels: ['tls', 'certificates', 'emergency'],
        storyPoints: 3,
        created: '2026-07-08 07:33:48',
        updated: '2026-07-10 23:18:22',
        resolution: '',
        comments: [
            {
                id: 'c-sec-3319-1',
                author: 'Tobias Lindqvist',
                when: '2026-07-10 23:04:50',
                body: 'Standby VIPs are bound and serving the new chain. Moving to the active pair after the next health interval.',
            },
            {
                id: 'c-sec-3319-2',
                author: 'Sam Okonkwo',
                when: '2026-07-10 23:18:22',
                body: 'Confirmed externally — the standby is handing out the new cert with the full intermediate chain. No trust warnings.',
            },
        ],
    },
    {
        key: 'SEC-3320',
        summary: 'Roll web tier keystores onto the new certificate',
        type: 'Task',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'High',
        assignee: 'Sam Okonkwo',
        projectKey: 'SEC',
        projectName: 'Security Engineering',
        description:
            'Update the web tier keystores so origin traffic presents the replacement certificate. Rolling restart, one node at a time, staying above quorum throughout.',
        reporter: 'Sam Okonkwo',
        epic: 'Certificate lifecycle',
        sprint: 'SecEng Sprint 18',
        labels: ['tls', 'certificates'],
        storyPoints: 3,
        created: '2026-07-08 07:36:02',
        updated: '2026-07-09 12:08:37',
        resolution: '',
        comments: [],
    },
    {
        key: 'SEC-3321',
        summary: 'Post-rotation validation and expiry monitoring reset',
        type: 'Task',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'Medium',
        assignee: 'Amara Osei',
        projectKey: 'SEC',
        projectName: 'Security Engineering',
        description:
            'Validate the served chain from outside the perimeter on every hostname covered by the wildcard, then reset the expiry monitors against the new not-after date.\n\nThe monitor reset is the part people forget — without it the next rotation is another emergency.',
        reporter: 'Sam Okonkwo',
        epic: 'Certificate lifecycle',
        sprint: 'SecEng Sprint 18',
        labels: ['tls', 'certificates', 'validation'],
        storyPoints: 2,
        created: '2026-07-08 07:38:29',
        updated: '2026-07-09 12:09:11',
        resolution: '',
        comments: [],
    },

    // ── NET · CHG0030007 Load balancer TLS policy update (Implement) ──────────
    {
        key: 'NET-4451',
        summary: 'Snapshot load balancer configuration before policy change',
        type: 'Task',
        status: 'Done',
        statusCategory: 'done',
        priority: 'Medium',
        assignee: 'Ken Nakamura',
        projectKey: 'NET',
        projectName: 'Network Engineering',
        description:
            'Capture the running configuration from both load balancer units so the hardened TLS policy can be reverted exactly, not approximately.',
        reporter: 'Dana Whitfield',
        epic: 'TLS policy hardening',
        sprint: 'Network Sprint 12',
        labels: ['loadbalancer', 'tls', 'pre-change'],
        storyPoints: 1,
        created: '2026-06-19 13:45:22',
        updated: '2026-07-10 22:02:14',
        resolution: 'Done',
        comments: [
            {
                id: 'c-net-4451-1',
                author: 'Ken Nakamura',
                when: '2026-07-10 22:02:14',
                body: 'Configs captured from both units and checked into the network config repo. Diff against last week is clean.',
            },
        ],
    },
    {
        key: 'NET-4452',
        summary: 'Apply hardened TLS policy to standby unit',
        type: 'Story',
        status: 'In Progress',
        statusCategory: 'in-progress',
        priority: 'High',
        assignee: 'Ken Nakamura',
        projectKey: 'NET',
        projectName: 'Network Engineering',
        description:
            'Apply the hardened cipher suite and protocol floor to the standby unit, then run the client compatibility matrix against it before it takes any production traffic.\n\nThe policy drops TLS 1.0/1.1 outright. The compatibility matrix is the gate — a legacy client failing here stops the rollout.',
        reporter: 'Dana Whitfield',
        epic: 'TLS policy hardening',
        sprint: 'Network Sprint 12',
        labels: ['loadbalancer', 'tls'],
        storyPoints: 5,
        created: '2026-06-19 13:48:05',
        updated: '2026-07-10 23:31:47',
        resolution: '',
        comments: [
            {
                id: 'c-net-4452-1',
                author: 'Ken Nakamura',
                when: '2026-07-10 23:09:12',
                body: 'Policy is on the standby. Running the compatibility matrix now — 40 clients, about 20 minutes.',
            },
            {
                id: 'c-net-4452-2',
                author: 'Elena Vasquez',
                when: '2026-07-10 23:31:47',
                body: 'One legacy payment terminal fleet still negotiates TLS 1.1. Flagging before we touch the active peer — this needs a decision, not a workaround.',
            },
        ],
    },
    {
        key: 'NET-4453',
        summary: 'Apply policy to active peer and validate',
        type: 'Story',
        status: 'To Do',
        statusCategory: 'todo',
        priority: 'High',
        assignee: 'Elena Vasquez',
        projectKey: 'NET',
        projectName: 'Network Engineering',
        description:
            'Once the standby is proven, fail over, apply the same policy to the former active unit, and validate the pair serves a consistent policy.',
        reporter: 'Dana Whitfield',
        epic: 'TLS policy hardening',
        sprint: 'Network Sprint 12',
        labels: ['loadbalancer', 'tls'],
        storyPoints: 3,
        created: '2026-06-19 13:50:33',
        updated: '2026-07-10 23:32:09',
        resolution: '',
        comments: [
            {
                id: 'c-net-4453-1',
                author: 'Elena Vasquez',
                when: '2026-07-10 23:32:09',
                body: 'Holding on NET-4452 until the TLS 1.1 terminal question is answered.',
            },
        ],
    },

    // ── NET · CHG0030008 WAN router IOS upgrade (Review) ──────────────────────
    {
        key: 'NET-4460',
        summary: 'Stage IOS image on branch routers',
        type: 'Task',
        status: 'Done',
        statusCategory: 'done',
        priority: 'Medium',
        assignee: 'Marcus Bell',
        projectKey: 'NET',
        projectName: 'Network Engineering',
        description:
            'Pre-stage the target IOS image onto every branch router so the upgrade window is a reload, not a transfer over the WAN link we are about to bounce.',
        reporter: 'Ken Nakamura',
        epic: 'Branch WAN refresh',
        sprint: 'Network Sprint 12',
        labels: ['wan', 'router', 'pre-change'],
        storyPoints: 2,
        created: '2026-06-15 09:22:41',
        updated: '2026-07-10 19:14:03',
        resolution: 'Done',
        comments: [
            {
                id: 'c-net-4460-1',
                author: 'Marcus Bell',
                when: '2026-07-10 19:14:03',
                body: 'Image staged and checksummed on all branch routers. Two sites needed a second pass on a slow link but both verified.',
            },
        ],
    },
    {
        key: 'NET-4461',
        summary: 'Upgrade branch routers sequentially',
        type: 'Story',
        status: 'Done',
        statusCategory: 'done',
        priority: 'High',
        assignee: 'Marcus Bell',
        projectKey: 'NET',
        projectName: 'Network Engineering',
        description:
            'Reload each branch router onto the staged image one site at a time, confirming the tunnel re-establishes before moving to the next. No parallel reloads — a bad image would take every branch down at once.',
        reporter: 'Ken Nakamura',
        epic: 'Branch WAN refresh',
        sprint: 'Network Sprint 12',
        labels: ['wan', 'router'],
        storyPoints: 8,
        created: '2026-06-15 09:25:17',
        updated: '2026-07-11 01:48:36',
        resolution: 'Done',
        comments: [
            {
                id: 'c-net-4461-1',
                author: 'Marcus Bell',
                when: '2026-07-11 00:52:20',
                body: 'Twelve of fourteen sites upgraded and tunnels back up. The two remaining are the ones that needed the second staging pass.',
            },
            {
                id: 'c-net-4461-2',
                author: 'Marcus Bell',
                when: '2026-07-11 01:48:36',
                body: 'All fourteen through. Routing converged, no flaps in the last 30 minutes.',
            },
        ],
    },
    {
        key: 'NET-4462',
        summary: 'Post-upgrade validation across branch sites',
        type: 'Task',
        status: 'Done',
        statusCategory: 'done',
        priority: 'Medium',
        assignee: 'Ken Nakamura',
        projectKey: 'NET',
        projectName: 'Network Engineering',
        description:
            'Validate throughput, tunnel state, and routing adjacency at every upgraded branch against the pre-change baseline.',
        reporter: 'Ken Nakamura',
        epic: 'Branch WAN refresh',
        sprint: 'Network Sprint 12',
        labels: ['wan', 'router', 'validation'],
        storyPoints: 3,
        created: '2026-06-15 09:27:50',
        updated: '2026-07-11 02:36:09',
        resolution: 'Done',
        comments: [
            {
                id: 'c-net-4462-1',
                author: 'Ken Nakamura',
                when: '2026-07-11 02:36:09',
                body: 'All fourteen branches match baseline within noise. Throughput is actually up ~6% on the three sites that were on the oldest image.',
            },
        ],
    },

    // ── OPS · CHG0030016 VPN concentrator reboot and patch (Closed) ───────────
    {
        key: 'OPS-887',
        summary: 'Drain and patch VPN concentrator A',
        type: 'Task',
        status: 'Done',
        statusCategory: 'done',
        priority: 'Medium',
        assignee: 'Amara Osei',
        projectKey: 'OPS',
        projectName: 'IT Operations',
        description:
            'Drain sessions off concentrator A, apply the monthly patch set, reboot, and return it to the pool before touching B.',
        reporter: 'Priya Raghunathan',
        epic: 'Monthly maintenance',
        sprint: 'Ops Sprint 44',
        labels: ['vpn', 'maintenance'],
        storyPoints: 2,
        created: '2026-06-28 16:40:11',
        updated: '2026-07-10 20:22:48',
        resolution: 'Done',
        comments: [
            {
                id: 'c-ops-887-1',
                author: 'Amara Osei',
                when: '2026-07-10 20:22:48',
                body: 'Drained cleanly, patched, back in the pool. Session count recovered to normal within a few minutes.',
            },
        ],
    },
    {
        key: 'OPS-888',
        summary: 'Drain and patch VPN concentrator B',
        type: 'Task',
        status: 'Done',
        statusCategory: 'done',
        priority: 'Medium',
        assignee: 'Amara Osei',
        projectKey: 'OPS',
        projectName: 'IT Operations',
        description:
            'Same treatment as concentrator A, once A is back in the pool and carrying traffic. The pair is never both out at once.',
        reporter: 'Priya Raghunathan',
        epic: 'Monthly maintenance',
        sprint: 'Ops Sprint 44',
        labels: ['vpn', 'maintenance'],
        storyPoints: 2,
        created: '2026-06-28 16:41:39',
        updated: '2026-07-10 21:05:17',
        resolution: 'Done',
        comments: [
            {
                id: 'c-ops-888-1',
                author: 'Amara Osei',
                when: '2026-07-10 21:05:17',
                body: 'B is patched and back. Both concentrators are on the July set now.',
            },
        ],
    },
    {
        key: 'OPS-889',
        summary: 'Post-maintenance validation of VPN pool',
        type: 'Task',
        status: 'Done',
        statusCategory: 'done',
        priority: 'Low',
        assignee: 'Priya Raghunathan',
        projectKey: 'OPS',
        projectName: 'IT Operations',
        description:
            'Confirm both concentrators are healthy, balanced, and authenticating against the directory after the patch.',
        reporter: 'Priya Raghunathan',
        epic: 'Monthly maintenance',
        sprint: 'Ops Sprint 44',
        labels: ['vpn', 'maintenance', 'validation'],
        storyPoints: 1,
        created: '2026-06-28 16:43:02',
        updated: '2026-07-10 21:44:55',
        resolution: 'Done',
        comments: [
            {
                id: 'c-ops-889-1',
                author: 'Priya Raghunathan',
                when: '2026-07-10 21:44:55',
                body: 'Pool is balanced and auth is clean on both units. Closing out the monthly.',
            },
        ],
    },
]

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
 * Read a request header as a plain string.
 *
 * getHeader() is the documented accessor and is case-insensitive, but the raw
 * `headers` map is keyed by whatever casing the caller sent and can hand back an
 * array, exactly like queryParams does. Try the accessor, then walk the map.
 */
function header(request: any, name: string): string {
    if (!request) return ''

    if (typeof request.getHeader === 'function') {
        const direct = request.getHeader(name)
        if (direct) return String(direct).trim()
        const lowered = request.getHeader(name.toLowerCase())
        if (lowered) return String(lowered).trim()
    }

    const headers = request.headers
    if (!headers) return ''
    const wanted = name.toLowerCase()
    const sent = Object.keys(headers)
    for (let i = 0; i < sent.length; i++) {
        if (sent[i].toLowerCase() !== wanted) continue
        const value = headers[sent[i]]
        if (value === undefined || value === null) return ''
        if (typeof value === 'string') return value.trim()
        if (typeof value.join === 'function') return String(value.join(',')).trim()
        return String(value).trim()
    }
    return ''
}

/**
 * The Jira config for THIS request, or null when the caller sent none.
 *
 * Null is the ordinary, expected case on dev421992: no Jira is attached, the
 * Settings dialog is empty, and both routes serve fixtures. The base URL may
 * arrive with a trailing slash (people paste it out of a browser) — strip it,
 * because every path below is concatenated straight onto it.
 */
function readConfig(request: any): JiraConfig | null {
    let url = header(request, 'X-Jira-Url')
    const token = header(request, 'X-Jira-Token')
    if (!url || !token) return null

    while (url.length > 0 && url.charAt(url.length - 1) === '/') {
        url = url.slice(0, url.length - 1)
    }
    if (!url) return null

    return { baseUrl: url, token: token }
}

/**
 * One GET against Jira, with the PAT as Bearer auth.
 *
 * Every failure mode lands in the return value rather than an exception, because
 * the two routes want to fail DIFFERENTLY (the detail payload is the page; the
 * summaries are decoration) and that decision belongs to them, not here.
 *
 * The status is read before haveError() is trusted: a 404 is a perfectly good
 * answer from Jira, and only a call that never produced a status at all — DNS,
 * TLS, timeout — is a transport error.
 */
function jiraGet(config: JiraConfig, path: string): JiraHttpResult {
    try {
        const message = new RESTMessageV2()
        message.setHttpMethod('GET')
        message.setEndpoint(config.baseUrl + path)
        // A PAT is a Bearer token in Jira DC — not basic auth, and never a query param.
        message.setRequestHeader('Authorization', 'Bearer ' + config.token)
        message.setRequestHeader('Accept', 'application/json')
        message.setHttpTimeout(HTTP_TIMEOUT_MS)

        const response = message.execute()
        const status = Number(response.getStatusCode() || 0)

        if (!status || isNaN(status)) {
            const transport = response.haveError() ? String(response.getErrorMessage() || '') : ''
            return { status: 0, data: null, error: transport || 'Jira did not answer' }
        }
        if (status < 200 || status >= 300) {
            return { status: status, data: null, error: 'Jira answered HTTP ' + status }
        }

        const body = String(response.getBody() || '')
        try {
            return { status: status, data: JSON.parse(body), error: '' }
        } catch (parseFailure) {
            return { status: status, data: null, error: 'Jira answered with a body that is not JSON' }
        }
    } catch (callFailure) {
        // The token rides in a header, never in the endpoint, so nothing an
        // exception carries can leak it into a log line.
        return { status: 0, data: null, error: String(callFailure) }
    }
}

/** '' for null/undefined, so a missing Jira field renders as empty and not "null". */
function text(value: any): string {
    return value === undefined || value === null ? '' : String(value)
}

/** issuetype / status / priority / resolution are all `{ name }` — and all nullable. */
function named(value: any): string {
    return value && value.name ? String(value.name) : ''
}

/** assignee and reporter are frequently null. Reading .displayName blind is a 500. */
function personName(value: any): string {
    return value && value.displayName ? String(value.displayName) : ''
}

/**
 * Jira's three status-category keys are 'new' | 'indeterminate' | 'done'; the
 * console's are 'todo' | 'in-progress' | 'done'. Anything unrecognized lands on
 * 'todo' — an unknown status reads as not-started, which is the safe lie.
 */
function statusCategoryOf(status: any): JiraStatusCategory {
    const key =
        status && status.statusCategory && status.statusCategory.key
            ? String(status.statusCategory.key).toLowerCase()
            : ''
    if (key === 'done') return 'done'
    if (key === 'indeterminate') return 'in-progress'
    return 'todo'
}

/** '2026-07-10T18:41:33.000+0000' or '...Z' — Jira's ISO-8601, offset colon optional. */
const JIRA_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/

function pad2(value: number): string {
    return value < 10 ? '0' + value : String(value)
}

/**
 * Jira ISO-8601 -> ServiceNow UTC 'YYYY-MM-DD HH:MM:SS'.
 *
 * The client parses every date in this payload with parseSnDate, which accepts
 * ONLY the ServiceNow format — and Jira's '+0000' offset (no colon) is not even
 * valid input to a strict Date.parse, so there is no shortcut here. Parse it
 * explicitly, subtract the offset to get true UTC, and re-emit.
 *
 * The sign is the part that ships bugs: a stamp reading 18:41 at -0400 happened
 * at 22:41 UTC, so UTC = wall-clock MINUS the offset.
 */
function toSnDate(raw: any): string {
    const value = text(raw).trim()
    if (!value) return ''

    const parts = JIRA_DATETIME.exec(value)
    if (!parts) return ''

    let offsetMinutes = 0
    const zone = parts[7]
    if (zone && zone !== 'Z') {
        const sign = zone.charAt(0) === '-' ? -1 : 1
        const digits = zone.slice(1).replace(':', '')
        const zoneHours = parseInt(digits.slice(0, 2), 10)
        const zoneMinutes = parseInt(digits.slice(2, 4), 10)
        offsetMinutes =
            sign * ((isNaN(zoneHours) ? 0 : zoneHours) * 60 + (isNaN(zoneMinutes) ? 0 : zoneMinutes))
    }

    const utcMs =
        Date.UTC(
            parseInt(parts[1], 10),
            parseInt(parts[2], 10) - 1,
            parseInt(parts[3], 10),
            parseInt(parts[4], 10),
            parseInt(parts[5], 10),
            parseInt(parts[6], 10),
        ) -
        offsetMinutes * 60000

    const utc = new Date(utcMs)
    return (
        utc.getUTCFullYear() +
        '-' + pad2(utc.getUTCMonth() + 1) +
        '-' + pad2(utc.getUTCDate()) +
        ' ' + pad2(utc.getUTCHours()) +
        ':' + pad2(utc.getUTCMinutes()) +
        ':' + pad2(utc.getUTCSeconds())
    )
}

/**
 * Find a custom field's VALUE by its human LABEL.
 *
 * Custom fields carry per-instance ids — Story Points is customfield_10016 on one
 * Jira and customfield_10024 on the next — so none of them can be hardcoded here.
 * That is what `?expand=names` is for: it returns a fieldId -> label map alongside
 * the fields, so we look up the label this Jira happens to use and read whatever
 * id it points at. A Jira that has no such field is normal, not an error: the
 * caller degrades to '' / null.
 */
function customField(fields: any, names: any, labels: string[]): any {
    if (!fields || !names) return null
    const ids = Object.keys(names)
    for (let i = 0; i < labels.length; i++) {
        const wanted = labels[i].toLowerCase()
        for (let j = 0; j < ids.length; j++) {
            if (String(names[ids[j]]).toLowerCase() !== wanted) continue
            const value = fields[ids[j]]
            if (value !== undefined && value !== null && value !== '') return value
        }
    }
    return null
}

const EPIC_LABELS = ['Epic Link', 'Epic Name', 'Epic']

/**
 * The epic, as a NAME where Jira will give us one.
 *
 * An epic-typed parent carries its summary, which is the human name; the Epic
 * Link custom field carries only the epic's KEY. Prefer the parent, fall back to
 * the key, and never mistake a subtask's Story parent for an epic.
 */
function readEpic(fields: any, names: any): string {
    const parent = fields ? fields.parent : null
    if (parent && parent.fields && parent.fields.summary) {
        const parentType = named(parent.fields.issuetype).toLowerCase()
        if (parentType === 'epic') return String(parent.fields.summary)
    }

    const value = customField(fields, names, EPIC_LABELS)
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value.fields && value.fields.summary) return String(value.fields.summary)
    if (value.name) return String(value.name)
    if (value.value) return String(value.value)
    if (value.key) return String(value.key)
    return ''
}

/** GreenHopper's Sprint.toString(): '...Sprint@1a2b[id=5,state=ACTIVE,name=DBA Sprint 24,...]'. */
const SPRINT_NAME = /[,[]name=([^,\]]*)/

/**
 * The current sprint's name.
 *
 * Jira DC is genuinely inconsistent here: the Sprint field comes back as an array
 * of objects on a modern instance and as an array of GreenHopper toString() blobs
 * on an older one — and sometimes as a bare value rather than an array. Take the
 * LAST entry (the current sprint) and degrade to '' rather than rendering
 * 'com.atlassian.greenhopper.service.sprint.Sprint@1a2b[...]' at an operator.
 */
function readSprint(fields: any, names: any): string {
    const value = customField(fields, names, ['Sprint'])
    if (!value) return ''

    const entries = Array.isArray(value) ? value : [value]
    for (let i = entries.length - 1; i >= 0; i--) {
        const name = sprintName(entries[i])
        if (name) return name
    }
    return ''
}

function sprintName(entry: any): string {
    if (!entry) return ''
    if (typeof entry === 'string') {
        const parts = SPRINT_NAME.exec(entry)
        if (parts) return String(parts[1]).trim()
        // A plain name, from a Jira that hands back strings without the blob.
        return entry.indexOf('=') < 0 ? entry.trim() : ''
    }
    if (entry.name) return String(entry.name)
    return ''
}

const STORY_POINT_LABELS = ['Story Points', 'Story Point Estimate', 'Story point estimate']

/** null, not 0, when the field is absent — the client renders the absence. */
function readStoryPoints(fields: any, names: any): number | null {
    const value = customField(fields, names, STORY_POINT_LABELS)
    if (value === null || value === undefined || value === '') return null
    const points = Number(value)
    return isNaN(points) ? null : points
}

function readLabels(value: any): string[] {
    const labels: string[] = []
    if (!value || !Array.isArray(value)) return labels
    for (let i = 0; i < value.length; i++) {
        const label = text(value[i]).trim()
        if (label) labels.push(label)
    }
    return labels
}

/**
 * EVERY comment on the issue, oldest first. No cap.
 *
 * There used to be one (the most recent 50), and it was wrong for the only consumer
 * this field has. The AI report reads a blocking issue's thread to explain why a
 * change failed, and the explanation is not reliably in the newest comments — a
 * dependency that sank a Saturday change is often argued out weeks earlier, in the
 * middle of the thread. A cap that keeps the tail keeps the small talk and drops
 * the cause. If an issue's thread is long, that length is itself the signal.
 *
 * `body` is a plain string because this is REST v2. On v3 it would be an ADF
 * document — an object tree — and this line would silently render '[object
 * Object]' at an operator. That is the concrete reason the header insists on v2.
 */
function readComments(comment: any): JiraComment[] {
    const comments: JiraComment[] = []
    const raw = comment && Array.isArray(comment.comments) ? comment.comments : null
    if (!raw) return comments

    for (let i = 0; i < raw.length; i++) {
        const entry = raw[i]
        if (!entry) continue
        comments.push({
            id: text(entry.id),
            author: personName(entry.author),
            when: toSnDate(entry.created),
            body: text(entry.body),
        })
    }
    return comments
}

/** 'NET' out of 'NET-4451'. Only used when Jira somehow omits the project. */
function keyPrefix(key: string): string {
    const cut = key.indexOf('-')
    return cut > 0 ? key.slice(0, cut) : key
}

/** A Jira search/issue row -> the shape a list row or badge needs. */
function mapSummary(raw: any): JiraIssueSummary | null {
    if (!raw || !raw.key) return null
    const fields = raw.fields || {}
    return {
        key: String(raw.key),
        summary: text(fields.summary),
        type: named(fields.issuetype),
        status: named(fields.status),
        statusCategory: statusCategoryOf(fields.status),
        priority: named(fields.priority),
        assignee: personName(fields.assignee),
    }
}

/**
 * A search hit -> the shape the AI report reads. Same mapping as a summary, plus
 * the issue's own words: the WHOLE description and EVERY comment, uncapped. The
 * report's job is to explain why a change failed, and that explanation is routinely
 * buried mid-thread on the issue that blocked it — see readComments().
 */
function mapNarrative(raw: any): JiraIssueNarrative | null {
    const summary = mapSummary(raw)
    if (!summary) return null
    const fields = raw.fields || {}
    return {
        key: summary.key,
        summary: summary.summary,
        type: summary.type,
        status: summary.status,
        statusCategory: summary.statusCategory,
        priority: summary.priority,
        assignee: summary.assignee,
        description: text(fields.description),
        comments: readComments(fields.comment),
    }
}

/**
 * A Jira issue -> everything the detail surface renders.
 *
 * Null when the payload is not an issue at all; the caller turns that into an
 * upstream error rather than an innocent-looking `issue: null`, which the console
 * would (correctly) read as "Jira does not have this key".
 */
function mapDetail(raw: any): JiraIssueDetail | null {
    const summary = mapSummary(raw)
    if (!summary || !raw.fields) return null

    const fields = raw.fields
    const names = raw.names || null
    const project = fields.project || null
    const projectKey = project && project.key ? String(project.key) : keyPrefix(summary.key)

    return {
        key: summary.key,
        summary: summary.summary,
        type: summary.type,
        status: summary.status,
        statusCategory: summary.statusCategory,
        priority: summary.priority,
        assignee: summary.assignee,
        projectKey: projectKey,
        projectName:
            project && project.name ? String(project.name) : PROJECTS[projectKey] || projectKey,
        description: text(fields.description),
        reporter: personName(fields.reporter),
        epic: readEpic(fields, names),
        sprint: readSprint(fields, names),
        labels: readLabels(fields.labels),
        storyPoints: readStoryPoints(fields, names),
        created: toSnDate(fields.created),
        updated: toSnDate(fields.updated),
        resolution: named(fields.resolution),
        comments: readComments(fields.comment),
    }
}

/**
 * The fixture lookup — the answer when no Jira is configured. See the file header
 * for why the fixtures still exist and when they are (and are not) served.
 */
function findFixture(key: string): JiraIssueDetail | null {
    for (let i = 0; i < ISSUES.length; i++) {
        if (ISSUES[i].key === key) return ISSUES[i]
    }
    return null
}

/** Detail → the subset a list row or badge needs. */
function toSummary(issue: JiraIssueDetail): JiraIssueSummary {
    return {
        key: issue.key,
        summary: issue.summary,
        type: issue.type,
        status: issue.status,
        statusCategory: issue.statusCategory,
        priority: issue.priority,
        assignee: issue.assignee,
    }
}

/** Detail → the subset the AI report needs. The fixtures already carry both fields. */
function toNarrative(issue: JiraIssueDetail): JiraIssueNarrative {
    return {
        key: issue.key,
        summary: issue.summary,
        type: issue.type,
        status: issue.status,
        statusCategory: issue.statusCategory,
        priority: issue.priority,
        assignee: issue.assignee,
        description: issue.description,
        comments: issue.comments,
    }
}

/**
 * The real half of the payload: every change task in this instance that names
 * this issue, joined to its parent change.
 *
 * GlideRecordSecure on BOTH tables — this is caller-scoped data with ordinary
 * ACLs, unlike the journal/audit reads in activity.ts, so there is nothing to
 * step over and no reason to. A caller who cannot see a change task simply does
 * not get it back.
 *
 * Two queries rather than a dot-walk: the parents are fetched in one IN-list
 * keyed by the sys_ids the first query returned. Dot-walking through
 * GlideRecord.getValue() is unreliable, and a per-task parent read would be N+1.
 */
function readReferences(key: string): JiraReference[] {
    const taskRows: JiraReference[] = []
    const parentIds: string[] = []

    const tasks = new GlideRecordSecure('change_task')
    tasks.addQuery('correlation_display', key)
    // Canceled tasks are excluded here for the same reason they are excluded from
    // the window: the question this card answers is "which weekend work depends on
    // this issue", and canceled work is not work. A canceled task listing itself as
    // a dependent would read as a live commitment nobody intends to keep.
    tasks.addQuery('state', '!=', '4')
    tasks.setLimit(REFERENCE_LIMIT)
    tasks.query()

    while (tasks.next()) {
        const parentId = String(tasks.getValue('change_request') || '')
        taskRows.push({
            taskSysId: String(tasks.getValue('sys_id')),
            taskNumber: String(tasks.getValue('number')),
            taskShortDescription: String(tasks.getValue('short_description') || ''),
            taskState: String(tasks.getValue('state') || ''),
            changeSysId: parentId,
            changeNumber: '',
            changeShortDescription: '',
            changeState: '',
        })
        if (parentId && parentIds.indexOf(parentId) < 0) parentIds.push(parentId)
    }

    if (parentIds.length === 0) return taskRows

    const parents: { [sysId: string]: { number: string; short: string; state: string } } = {}
    const changes = new GlideRecordSecure('change_request')
    changes.addEncodedQuery('sys_idIN' + parentIds.join(','))
    changes.setLimit(parentIds.length)
    changes.query()
    while (changes.next()) {
        parents[String(changes.getValue('sys_id'))] = {
            number: String(changes.getValue('number')),
            short: String(changes.getValue('short_description') || ''),
            state: String(changes.getValue('state') || ''),
        }
    }

    // A task whose parent the caller cannot read keeps its task fields and
    // carries empty change fields — the console renders the task without a
    // change link rather than dropping the reference entirely.
    for (let i = 0; i < taskRows.length; i++) {
        const parent = parents[taskRows[i].changeSysId]
        if (!parent) {
            taskRows[i].changeSysId = ''
            continue
        }
        taskRows[i].changeNumber = parent.number
        taskRows[i].changeShortDescription = parent.short
        taskRows[i].changeState = parent.state
    }

    return taskRows
}

/**
 * The requested keys: de-duplicated, validated against KEY_PATTERN, capped.
 *
 * The validation is also what makes the JQL below safe to build by concatenation
 * — a key that survives KEY_PATTERN contains no quote, paren or space, so there
 * is nothing in it to break out of the `key in ("…")` list with.
 */
function uniqueKeys(raw: string): string[] {
    const requested = raw.split(',')
    const keys: string[] = []
    const seen: { [key: string]: boolean } = {}

    for (let i = 0; i < requested.length && keys.length < BATCH_LIMIT; i++) {
        const key = requested[i].trim()
        if (!key || seen[key] || !KEY_PATTERN.test(key)) continue
        seen[key] = true
        keys.push(key)
    }
    return keys
}

/** Fixture issues, for the unconfigured case. */
function fixtureIssues(keys: string[], narrative: boolean): JiraIssueSummary[] {
    const issues: JiraIssueSummary[] = []
    for (let i = 0; i < keys.length; i++) {
        const issue = findFixture(keys[i])
        if (issue) issues.push(narrative ? toNarrative(issue) : toSummary(issue))
    }
    return issues
}

/**
 * All the requested keys in ONE search, rather than one callout per key: the
 * activity feed and the Jiras tab can put a dozen keys on screen at once, and N
 * synchronous outbound calls inside a single scripted-REST transaction is how you
 * turn a badge row into a timeout.
 *
 * validateQuery=warn is load-bearing. Under Jira's default (strict), a JQL `key
 * in (...)` list containing a key from a project this Jira does not have is a 400
 * for the WHOLE query — and keys typed into change_task.correlation_display by
 * hand are exactly where that happens. 'warn' answers with the keys it does know
 * and says nothing about the rest, which is the contract the client already has:
 * a key absent from `issues` means "asked, and there is nothing".
 */
function searchIssues(config: JiraConfig, keys: string[], narrative: boolean): JiraIssueSummary[] {
    const jql = 'key in ("' + keys.join('","') + '")'
    const path =
        JIRA_API +
        '/search?jql=' + encodeURIComponent(jql) +
        '&fields=' + encodeURIComponent(narrative ? REPORT_FIELDS : SUMMARY_FIELDS) +
        '&maxResults=' + keys.length +
        '&validateQuery=warn'

    const result = jiraGet(config, path)
    if (result.error || !result.data || !Array.isArray(result.data.issues)) {
        // Summaries are decoration: a badge that cannot resolve still shows its
        // key. Log it and hand back nothing rather than failing the request.
        //
        // The report degrades the same way, and that is the right call: an AI
        // report that refuses to generate because Jira is down is worse than one
        // that generates and says the Jira side could not be read. The payload
        // still carries every key and which tasks named it.
        gs.warn(
            '[weekend-console] Jira ' + (narrative ? 'report' : 'summary') + ' search for ' +
            keys.length + ' key(s) failed: ' + (result.error || 'unexpected response shape') +
            '. Badges will render unresolved.',
        )
        return []
    }

    const raw = result.data.issues
    const issues: JiraIssueSummary[] = []
    for (let i = 0; i < raw.length; i++) {
        const issue = narrative ? mapNarrative(raw[i]) : mapSummary(raw[i])
        if (issue) issues.push(issue)
    }
    return issues
}

/**
 * GET /api/x_912401_weekend_c/jira/issues?keys=NET-4451,SEC-3319
 * Headers: X-Jira-Url, X-Jira-Token (both optional; without them, fixtures).
 *
 * Batch issues for lists and badges — the Jiras tab and the activity feed both
 * render many keys at once and neither needs a description or comments.
 * Keys with no issue behind them are simply absent from `issues`; the client
 * caches that as "asked, and there is nothing", so a miss costs one request.
 *
 * `?detail=full` adds the description and the comment thread to every issue, for
 * the ONE caller that needs them: the AI report, which reasons about what people
 * actually wrote on an issue and not merely whether it is Done. It is opt-in
 * because a badge must not pay a comment thread's freight, and it rides the same
 * single JQL search — see REPORT_FIELDS.
 *
 * THIS ROUTE NEVER FAILS. Summaries are decoration — a row whose summary did not
 * resolve still shows its key and still links through — so a dead or misconfigured
 * Jira degrades the badges and nothing else. It answers 200 with an empty list and
 * leaves the shouting to getIssue, where the payload actually is the page.
 */
export function listIssues(request: any, response: any): void {
    const keys = uniqueKeys(queryParam(request, 'keys'))
    const narrative = queryParam(request, 'detail') === 'full'
    if (keys.length === 0) {
        response.setBody({ issues: [] })
        return
    }

    const config = readConfig(request)
    if (!config) {
        response.setBody({ issues: fixtureIssues(keys, narrative) })
        return
    }

    if (!ABSOLUTE_URL.test(config.baseUrl)) {
        // Configured, but wrongly. Falling back to fixtures here would answer a
        // broken config with plausible data, which is worse than answering nothing.
        gs.warn('[weekend-console] X-Jira-Url is not an absolute http(s) URL; serving no summaries.')
        response.setBody({ issues: [] })
        return
    }

    response.setBody({ issues: searchIssues(config, keys, narrative) })
}

/**
 * GET /api/x_912401_weekend_c/jira/issue?key=NET-4451
 * Headers: X-Jira-Url, X-Jira-Token (both optional; without them, fixtures).
 *
 * One issue, plus the real change tasks that name it. `issue` and `references`
 * are siblings on purpose: they come from different systems. An unknown key is a
 * 200 with issue: null — not an error — and its references still resolve, so the
 * console can honestly say "no such issue in Jira, but these tasks point at it."
 * 400 is reserved for a caller who sent no key, or an unusable X-Jira-Url.
 *
 * THE TWO KINDS OF "NO ISSUE" ARE NOT THE SAME AND MUST NOT LOOK THE SAME. Jira
 * answering 404 means the key genuinely is not there — that is the issue: null
 * contract above, and the console renders it. Jira answering 401/403/5xx, or not
 * answering at all, means we DO NOT KNOW; that gets an error status, so the
 * client's getIssue throws and JiraDetailView renders its error state. Dressing a
 * failed callout up as "no such issue" would be a lie the operator cannot catch.
 */
export function getIssue(request: any, response: any): void {
    const key = queryParam(request, 'key').trim()

    if (!key) {
        response.setStatus(400)
        response.setBody({ error: 'key is required, e.g. ?key=NET-4451' })
        return
    }

    // A malformed key can't match an issue and can't match correlation_display
    // in any meaningful way — answer "not found" rather than running the queries.
    if (!KEY_PATTERN.test(key)) {
        response.setBody({ key: key, issue: null, references: [] })
        return
    }

    const config = readConfig(request)

    if (!config) {
        response.setBody({
            key: key,
            issue: findFixture(key),
            references: readReferences(key),
        })
        return
    }

    if (!ABSOLUTE_URL.test(config.baseUrl)) {
        response.setStatus(400)
        response.setBody({
            error: 'X-Jira-Url must be an absolute http(s) URL, e.g. https://jira.example.com',
        })
        return
    }

    const result = jiraGet(
        config,
        // fields=*all so the comment field and the custom fields come back; expand=names
        // so we can find the custom fields by LABEL, since their ids differ per instance.
        JIRA_API + '/issue/' + encodeURIComponent(key) + '?expand=names&fields=*all',
    )

    if (result.status === 404) {
        response.setBody({ key: key, issue: null, references: readReferences(key) })
        return
    }

    const issue = result.error ? null : mapDetail(result.data)
    if (!issue) {
        const reason = result.error || 'Jira answered with something that is not an issue'
        gs.error('[weekend-console] Jira lookup for ' + key + ' failed: ' + reason)
        response.setStatus(502)
        response.setBody({ error: 'Jira lookup failed: ' + reason })
        return
    }

    response.setBody({
        key: key,
        issue: issue,
        references: readReferences(key),
    })
}
