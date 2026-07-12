import { GlideRecordSecure } from '@servicenow/glide'

/**
 * The console's Jira surface, served from the app's own scope.
 *
 * WHAT THIS IS. Change tasks name Jira issues — the key rides on
 * change_task.correlation_display (e.g. NET-4451). This route turns those keys
 * into issues the console can RENDER, so a weekend operator can read the ticket
 * behind a task without leaving the console and without a Jira account.
 *
 * It replaces an earlier route that resolved keys into Jira BROWSE URLS. That
 * was the wrong capability: it knew a key existed and then handed the user off.
 * Nothing of it survives — the jira_base_url property it depended on is gone too,
 * because config an admin can set that changes nothing is worse than no config.
 *
 * TWO SOURCES, AND THE SEAM BETWEEN THEM IS THE POINT.
 *
 *   The ISSUE is mock. There is no Jira attached to this instance, so the
 *   Jira-side fields (summary, status, assignee, sprint, comments…) are the
 *   fixtures in ISSUES below. They are hand-authored against the 20 real keys
 *   the seeded change tasks actually carry, so statuses track their tasks: a
 *   Jira issue backing a closed change task reads Done.
 *
 *   The REFERENCES are real. readReferences() queries change_task for this key
 *   and joins the parent change — live, ACL-checked, no fixtures. "Which weekend
 *   change tasks depend on this issue" is a question the real Jira page CANNOT
 *   answer, and it is the entire reason a Jira page exists inside this console.
 *
 * The wire shape keeps them apart: `issue` and `references` are siblings, never
 * nested, because they come from different systems and one can be absent while
 * the other is present. An unrecognized key is NOT an error — it answers
 * issue: null with its references intact, and the console says so.
 *
 * WIRING A REAL JIRA. Replace findIssue() with an sn_ws.RESTMessageV2 callout to
 * {base}/rest/api/3/issue/{key} behind a credential alias, and map the response
 * into JiraIssueDetail. Nothing else in this file — and nothing at all in the
 * client — has to change. That is what the seam is for.
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

type JiraStatusCategory = 'todo' | 'in-progress' | 'done'

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

/** The mock lookup. A real Jira would replace exactly this function — see the file header. */
function findIssue(key: string): JiraIssueDetail | null {
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
 * GET /api/x_912401_weekend_c/jira/issues?keys=NET-4451,SEC-3319
 *
 * Batch summaries for lists and badges — the Jiras tab and the activity feed
 * both render many keys at once and neither needs a description or comments.
 * Keys with no issue behind them are simply absent from `issues`; the client
 * caches that as "asked, and there is nothing", so a miss costs one request.
 */
export function listIssues(request: any, response: any): void {
    const requested = queryParam(request, 'keys').split(',')
    const issues: JiraIssueSummary[] = []
    const seen: { [key: string]: boolean } = {}

    for (let i = 0; i < requested.length && issues.length < BATCH_LIMIT; i++) {
        const key = requested[i].trim()
        if (!key || seen[key] || !KEY_PATTERN.test(key)) continue
        seen[key] = true
        const issue = findIssue(key)
        if (issue) issues.push(toSummary(issue))
    }

    response.setBody({ issues: issues })
}

/**
 * GET /api/x_912401_weekend_c/jira/issue?key=NET-4451
 *
 * One issue, plus the real change tasks that name it. `issue` and `references`
 * are siblings on purpose: they come from different systems. An unknown key is a
 * 200 with issue: null — not an error — and its references still resolve, so the
 * console can honestly say "no such issue in Jira, but these tasks point at it."
 * 400 is reserved for a caller who sent no key at all.
 */
export function getIssue(request: any, response: any): void {
    const key = queryParam(request, 'key').trim()

    if (!key) {
        response.setStatus(400)
        response.setBody({ error: 'key is required, e.g. ?key=NET-4451' })
        return
    }

    // A malformed key can't match a fixture and can't match correlation_display
    // in any meaningful way — answer "not found" rather than running the queries.
    if (!KEY_PATTERN.test(key)) {
        response.setBody({ key: key, issue: null, references: [] })
        return
    }

    response.setBody({
        key: key,
        issue: findIssue(key),
        references: readReferences(key),
    })
}
