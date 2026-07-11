# Weekend Change Console

ServiceNow Fluent app (scope `x_912401_weekend_c`) — a React 19 UI Page that is a live console for weekend change windows. Instance: `dev421992` (basic auth alias `dev421992`, already configured via `now-sdk auth`). Deployed page: https://dev421992.service-now.com/x_912401_weekend_c_console.do

Read `DESIGN.md` (visual system — Claude-inspired cream/coral/serif) and `PRODUCT.md` (register, users, principles) before UI work.

## Commands

- `npm run build` — tailwind CSS generation + `now-sdk build`. Must pass before deploy.
- `npm run deploy` — `now-sdk install` to the instance. **Never deploy unless Abey explicitly asks.**
- `npm run dev` — local dev server with LiveReload + `/api`,`/amb` proxies (Abey usually runs it himself; check ports 8081/3000 before starting another).
- `npx tailwindcss -i ./src/client/styles/theme.css -o ./src/client/styles/tailwind.generated.css --watch=always` — CSS watcher; plain `--watch` exits when stdin closes in background shells.
- `npx tsc --noEmit -p src/client/tsconfig.json` — the standard check after edits.
- `npx now-sdk query <table> -q "<encoded query>" -f fields` — instance queries.

## Architecture

- `src/fluent/` — UiPage definition (endpoint `x_912401_weekend_c_console.do`, `$id` key is still `Now.ID['incident-manager-page']` — intentional, do not change) + application menu.
- `src/client/app.tsx` — shell: TopNav (screen menu Plan/Execute/Review, world clocks HK/Zug/NY, Live dot, window badge), full-width header (phase headline, window controls, compact stat chips), then a 50/50 split: list pane (toolbar row = state tabs + group/assignee selects + List/Timeline toggle) and detail pane. URL params: `?screen=` & `?id=`, Polaris iframe bridging in `pushUrl`.
- `src/client/utils/phases.ts` — screen/state model. Plan={-4,-3,-2}, Execute={-1,-2,0,3} (keeps completed work visible), Review={0,3}. Default screen by time vs window.
- `src/client/utils/weekendWindow.ts` + `datetime.ts` — window math: Fri `startTime` → Sun `endTime` ET (default 17:00→23:59, configurable via dialog, persisted in localStorage `wcm.windowConfig`), week offset navigation, all Intl-based ET↔UTC (never hardcode offsets; floor to whole seconds before offset math).
- `src/client/hooks/useWeekendChanges.ts` — data owner: Table API load + silent AMB refetch.
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
- `src/client/index.html` invariants: inline CDATA `Array.from` polyfill before the module script, `<sdk:now-ux-globals>`, `?uxpcb=$[UxFrameworkScriptables.getFlushTimestamp()]` on the module src. Breaking any of these breaks Polaris silently.

## Test data on dev421992

110 `change_request` ([WCM-TEST-DATA] marker): 10 lifecycle exemplars for this weekend (CHG0030001–16 range, with 20 change_tasks carrying Jira keys in `correlation_display`, 31 task_ci affected-CI rows) + 100 Friday-night changes (12 groups, 27 assignees, no tasks). Cleanup: `descriptionLIKE[WCM-TEST-DATA]` on change_request AND change_task (no cascade); task_ci via `taskIN<the 10 weekend sys_ids>`. Note: seeded change_task planned dates are EMPTY (never stuck) — task rows show "—" times.

## Working conventions

- **No monospace, ever** (global preference) — sans stack everywhere including numbers, IDs, code/plan panels.
- Theme token classes only in TSX (bg-primary, text-ink, bg-surface-card…) — no raw hex outside `theme.css`/validated chart palettes.
- DESIGN.md rules: serif display 400 with negative tracking for headlines only; coral scarce; hairline borders; no shadows; no hover styling beyond press states (Radix highlight states use surface tones).
- Do not deploy or run browser verification unless explicitly asked. Typecheck is the default gate.
- Data seeding/instance mutations are usually delegated to a background agent; report BR disable/re-enable honestly.

## State at end of 2026-07-10 session

Committed to git (local repo, no remote). **Deployed to the instance 2026-07-10** (full build: split view, phases, timeline, filters, clocks, AMB, app menu + Console module). First live AMB test showed `/meta/subscribe` timeouts; root cause traced to the keepalive model — the server long-holds `/meta/connect` up to advice.timeout (~30s), so a 15s universal reply timeout plus gaps with no outstanding connect desyncs the session. `SnowAmb.ts` was reworked locally (continuous held-connect loop per the protocol capture, subscribe retry w/ 2s-doubling backoff, server-initiated rehandshake handling, revivable destroy() for StrictMode dev, verbose Bayeux tracing — silence via `localStorage['wcm.ambDebug']='0'`). **This rework builds + typechecks but is NOT yet deployed.** Do NOT add REST "session priming" before subscribes — that's only for server-process WS clients; the browser session cookie suffices. Next natural steps: deploy when asked and re-test AMB with the trace on, CI chips on the detail pane (task_ci data is seeded and unused by the UI), Jira badge links, and re-seeding change_task planned dates if the task timeline matters.
