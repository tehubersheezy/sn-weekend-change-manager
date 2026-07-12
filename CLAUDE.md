# Weekend Change Console

ServiceNow Fluent app (scope `x_912401_weekend_c`) — a React 19 UI Page that is a live console for weekend change windows. Instance: `dev421992` (basic auth alias `dev421992`, already configured via `now-sdk auth`). Deployed page: https://dev421992.service-now.com/x_912401_weekend_c_console.do

Read `DESIGN.md` (visual system — Claude-inspired cream/coral/serif) and `PRODUCT.md` (register, users, principles) before UI work.

## Commands

- `npm run build` — tailwind CSS generation + `now-sdk build`. Must pass before deploy.
- `npm run deploy` — `now-sdk install` to the instance. **Never deploy unless Abey explicitly asks.**
- `npm run dev` — local dev server with LiveReload + `/api`,`/amb` proxies (Abey usually runs it himself; check ports 3000/8081 before starting another). Read "Dev server vs deployed build" below before mixing it with builds or deploys.
- `npx tailwindcss -i ./src/client/styles/theme.css -o ./src/client/styles/tailwind.generated.css --watch=always` — CSS watcher; plain `--watch` exits when stdin closes in background shells.
- `npx tsc --noEmit -p src/client/tsconfig.json` — the standard check after edits.
- Instance queries: **always via the `sn` skill** (Abey's standing preference). Raw `npx now-sdk query` caps at 100 rows/page and has no aggregates — build/deploy/auth are the only now-sdk jobs.

## Dev server vs deployed build (hard-won 2026-07-11)

Both builders write the **same `dist/static`**, in two different shapes, and the dev server serves whatever is there:

- **Deploy shape** (`npm run build`): `index.html` references `/uxasset/externals/x_912401_weekend_c/main.jsdbx?uxpcb=$[Jelly]`, and the whole file is XML-serialized — self-closing `<script/>` and `<div id="root"/>`. Only valid after the instance processes it. A raw browser parse treats `<script/>` as an *unclosed* tag and swallows the rest of the document as script text: no `#root`, **blank page, zero console errors**. That silhouette = deploy-shaped HTML on the dev server.
- **Dev shape** (dev server's own watch build): `index.html` references local `main.js`, tags properly closed.
- The watch build re-fires on **source changes only**. Running `npm run build`/`npm run deploy` while the dev server is up leaves deploy-shaped files in `dist/static` — afterwards, `touch` any client source file to flip it back to dev shape.
- `/uxasset/externals` (like `/api`, `/amb`, `/uxta`) proxies to dev421992. A bundle path missing locally falls through to the proxy, so the dev page can silently run the **deployed** bundle — local edits appear ignored. Diagnose by checking the served root's `<script src>`: `main.js` = local build, `main.jsdbx` = instance code via proxy.
- Ports: the dev server binds **localhost:3000** (ignores `PORT`, no CLI flag; the 8081 in older notes was a second instance falling back because 3000 was occupied). 35729 = LiveReload, 3001 = internal WebSocket.
- Deploy hygiene: run `npm run build` immediately before `npm run deploy` — install uploads the built artifact without rebuilding, and a dev-shaped `dist/static` must never ship.
- `src/client/main.tsx` carries dev-resilience that is inert on-instance: it recreates `#root` when missing (only ever true under the swallowed-body parse above) and prunes unversioned duplicate app CSS only when the authoritative `?uxpcb=` copy exists (always true deployed; in dev the bundler-injected `&v=`-stamped link is the only stylesheet and must survive).

## Architecture

- `src/fluent/` — UiPage definition (endpoint `x_912401_weekend_c_console.do`, `$id` key is still `Now.ID['incident-manager-page']` — intentional, do not change) + application menu.
- `src/client/app.tsx` — shell: TopNav (screen menu Plan/Execute/Review, world clocks HK/Zug/NY, Live dot, window badge), full-width header (phase headline, window controls, compact stat chips), then a 50/50 split: list pane (toolbar row = state tabs + group/assignee selects + List/Timeline toggle) and detail pane. URL params: `?screen=` & `?id=`, Polaris iframe bridging in `pushUrl`.
- `src/client/utils/phases.ts` — screen/state model. Plan={-4,-3,-2}, Execute={-1,-2,0,3} (keeps completed work visible), Review={0,3}. Default screen by time vs window.
- `src/client/utils/weekendWindow.ts` + `datetime.ts` — window math: Fri `startTime` → Sun `endTime` ET (default 17:00→23:59, configurable via dialog, persisted in localStorage `wcm.windowConfig`), week offset navigation, all Intl-based ET↔UTC (never hardcode offsets; floor to whole seconds before offset math).
- `src/client/hooks/useWeekendChanges.ts` — data owner: Table API load + silent AMB refetch.
- `src/client/services/ActivityService.ts` + `hooks/useActivityFeed.ts` + `components/ActivityFeed.tsx` — the detail pane's resting view: live weekend activity feed (comments + work notes from `sys_journal_field`, state/approval transitions from `sys_audit`), scoped by chunked sys_id IN-lists over the loaded window population. No AMB channel of its own — every feed-worthy event also updates the parent record, so it refetches off `changes`/`tasks` identity changes. Feed hook lives in app.tsx so back-nav from a detail is instant. `utils/stateLabels.ts` maps audit's raw codes to labels.
- `src/client/services/SnowAmb.ts` + `hooks/useAmb.ts` — Bayeux/CometD WebSocket to `/amb` (record watchers, reconnect/resubscribe). **Only works deployed on-instance** (cookie auth on WS upgrade); localhost always shows "Connecting". Protocol reference: `~/Projects/mlx-audio/servicenow-amb/protocol.md`.
- `src/client/components/ui/` — vendored shadcn components (relative imports only, no `@/` aliases), themed via `styles/theme.css` tokens.
- `src/client/components/TimelineView.tsx` — Gantt view; its bar palette is dataviz-validated against the cream canvas — don't swap colors without re-running the validator.

## ServiceNow gotchas (hard-won, trust these)

- **`change_request` planned dates are `start_date`/`end_date`** (labels say "Planned start/end date"). `planned_start_date` does NOT exist on change_request — and ServiceNow silently drops invalid encoded-query terms, returning the whole table. `change_task` DOES use `planned_start_date`/`planned_end_date`.
- change_request states: New=-5, Assess=-4, Authorize=-3, Scheduled=-2, Implement=-1, Review=0, Closed=3, Canceled=4. change_task: Pending=-5, Open=1, In Progress=2, Closed=3. Window query excludes New and Canceled.
- State isn't writable at insert (change model BRs); seeding requires stepping transitions (`approval=approved` to pass Assess) or temporarily disabling the state-model BRs (re-enable after!). `type` derives from `chg_model` at insert (Standard `e55d0bfec343101035ae3f52c1d3ae49`, Emergency `62d10fa1c303101035ae3f52c1d3aec1`).
- `assigned_to` must be a member of `assignment_group` (403 otherwise).
- Affected CIs = `task_ci` table (task, ci_item); writes blocked past New state by "Change Model: Read only CI" BRs (same disable/re-enable trick).
- Table API: always `X-UserToken: window.g_ck` + `sysparm_display_value=all` (fields arrive `{value, display_value}` — `utils/fields.ts` helpers).
- **URI length limit**: the instance front proxy (snow_adc) 414s somewhere under ~11.5KB — a full window's 350 sys_ids in one IN-list breaks. Chunk IN-lists at 80 ids (~2.6KB, verified OK) — `services/tableApi.ts` `chunkIds`.
- `sys_journal_field` keys by `element_id`, `sys_audit` by `documentkey` — both plain strings, NOT references (no dot-walking; IN-list scoping only). sys_audit stores raw codes for choice fields and sys_ids for references (no display values), and approval-history journal noise mirrors into it as "JOURNAL FIELD ADDITION" rows — whitelist `fieldname` when querying. `user`/`sys_created_by` are username strings; resolve via sys_user (and guard for accounts with empty `name`). Both tables read fine as admin; non-admin ACLs untested.
- `src/client/index.html` invariants: inline CDATA `Array.from` polyfill before the module script, `<sdk:now-ux-globals>`, `?uxpcb=$[UxFrameworkScriptables.getFlushTimestamp()]` on the module src. Breaking any of these breaks Polaris silently.

## Test data on dev421992

110 `change_request` ([WCM-TEST-DATA] marker): 10 lifecycle exemplars for this weekend (CHG0030001–16 range, with 20 change_tasks carrying Jira keys in `correlation_display`, 31 task_ci affected-CI rows) + 100 Friday-night changes (12 groups, 27 assignees, no tasks). Cleanup: `descriptionLIKE[WCM-TEST-DATA]` on change_request AND change_task (no cascade); task_ci via `taskIN<the 10 weekend sys_ids>`. Note: seeded change_task planned dates are EMPTY (never stuck) — task rows show "—" times.

Also seeded 2026-07-11: 25 journal entries via PATCHes to the journal fields — batch 1 of 11 (7 comments, 4 work_notes; 9 change_request exemplars + CTASK0010009/0010012), batch 2 of 14 (10 changes spanning Implement/Scheduled/Review/Closed/Assess: CHG0030261/0266/0258/0270/0267/0089/0002/0243/0008/0240, plus CTASK0010024/0010026/0010013/0010098) — as feed demo content, all authored `abeyahmad`. Cleanup: sys_journal_field `elementINcomments,work_notes^element_idIN<marked change+task sys_ids>`. The instance user `abeyahmad` had empty first/last name; set to Abey/Ahmad so the feed shows "Abey Ahmad" not a username. NB the window's task population is ~242 (OOB demo change_tasks overlap too, not just the 20 marked ones).

## Working conventions

- **No monospace, ever** (global preference) — sans stack everywhere including numbers, IDs, code/plan panels.
- Theme token classes only in TSX (bg-primary, text-ink, bg-surface-card…) — no raw hex outside `theme.css`/validated chart palettes.
- DESIGN.md rules: serif display 400 with negative tracking for headlines only; coral scarce; hairline borders; no shadows; no hover styling beyond press states (Radix highlight states use surface tones).
- Do not deploy or run browser verification unless explicitly asked. Typecheck is the default gate.
- Data seeding/instance mutations are usually delegated to a background agent; report BR disable/re-enable honestly.

## State at end of 2026-07-11 session

DEPLOYED to dev421992 on 2026-07-11 (instance and local are in sync): (1) the `SnowAmb.ts` keepalive rework from 2026-07-10 — continuous held-connect loop, subscribe retry w/ 2s-doubling backoff, rehandshake handling, revivable destroy(), Bayeux tracing (silence: `localStorage['wcm.ambDebug']='0'`); do NOT add REST "session priming" before subscribes. (2) NEW this session: the weekend activity feed — the detail pane's resting view is now a live feed (comments/work notes/state transitions/approvals across the window, day-grouped, click-through to detail, "Weekend activity" back affordance in ChangeDetailView; "Select a change" placeholder is gone). Feed verified against the instance by replaying its exact chunked queries via `sn` — that's what surfaced the 414 URI limit and the empty-user-name gotchas. (3) ALSO this session: ChangeDetailView is now tabbed — Details / Change tasks / Affected CIs / Jiras (muted counts in the triggers, tab resets to Details on change switch). Affected CIs read task_ci via `ChangeService.listAffectedCis` (`task=<change sys_id>`, dot-walked `ci_item.sys_class_name`/`ci_item.operational_status` — verified via `sn`; note task_ci.task holds the CHANGE sys_id, not a ctask) + a task_ci AMB watch. Jiras derive client-side from tasks' `correlation_display` (`jiraIssuesFromTasks` in JiraList.tsx); `correlation_id` is empty instance-wide so Jira rows are display-only, no links. New components: CiList.tsx, JiraList.tsx. Detail tabs iterated per Abey: count BEFORE the label, muted, singular/plural label ("1 Jira" / "2 Change tasks"). (4) main.tsx dev-resilience (deployed-inert by construction): recreate `#root` when missing (dev server's self-closing `<script/>` swallows the body — see "Dev server vs deployed build"), and `dropUnversionedAppCss` now prunes only when the authoritative `?uxpcb=` link exists (dev's only stylesheet is `&v=`-stamped; pruning it left dev unstyled). Both deploys on 2026-07-11 (tabs, then tab-label rework + dev hardening). Old wedged dev-server pair from 7-10 was killed; fresh instance on localhost:3000. Next natural steps: live-test AMB trace + feed together on-instance (a comment posted on-instance should appear in the feed within ~a second of the watcher firing), Jira badge links if a Jira base URL ever exists, re-seeding change_task planned dates if the task timeline matters.
