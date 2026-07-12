# The 69 "product-internal" GraphQL schemas: a second look

_A reachability-and-usefulness audit for the Weekend Change Console, run against dev421992 (admin `abeyahmad` vs ITIL `abel.tuter`/devitil), reading SDL from `sys_graphql_schema` and probing the single `/api/now/graphql` endpoint. 39 schemas were audited in depth after adversarial verification; the rest fall into the same families and gates as the ones examined._

## 1. Bottom line

Writing them off as plumbing was **mostly right, but for a slightly wrong reason** — and one corner deserved the second look you asked for. The overwhelming majority are authoring/config APIs for other products (Decision Tables, Creator Studio, Theme Builder, Mobile Card Builder, NLU/Virtual Agent, Diagram Builder, Workflow Studio, omnichannel chat, telemetry analytics). None of them carry change/task/CI data, so they are useless to this console on subject matter alone, independent of any gate. What the second look actually overturned is the *reason* we'd have dismissed them: the `requires_snc_internal_role` flag does **not** mean "admin only," and several schemas that flag claims are locked are in fact reachable by a plain ITIL browser user. So the dismissal survives, but the mental model behind it ("these are gated to admins") was wrong and would have burned us on the next instance. The genuinely useful-to-this-console count is honestly **zero net-new capability** — everything reachable is something the Table API already does more cheaply.

## 2. The `snc_internal` gate — what it actually is

This reframes everything, so it goes first.

**It is not an elevated-privilege check and it is not a name lookup.** I proved the name-lookup part directly: I granted `abel.tuter` a role literally named `snc_internal` (a fake left by a prior tester, sys_id `4c8429192f42c3507efd1d707fa4e348`), confirmed server-side that `gs.hasRole('snc_internal')` returned **true** for abel in that same session (with `gs.hasRole('itil')` as a passing control and `gs.getUserName()` confirming identity) — and the gated root `snWorkflowStudio.workflowStudio` **stayed `null`** for devitil anyway. Name-based membership satisfied, gate still shut. So the gate does not consult the ordinary named-role set.

**What it really is:** the Explicit Roles plugin's internal-vs-external user designation. Per the ServiceNow docs (australia/latest, verbatim): "all users have either the snc_internal role to access internal resources, or the snc_external role to access external resources," and under Zero Trust these roles "cannot be removed." The platform check binds to the *canonical* `snc_internal` (by sys_id / plugin-computed designation), which is installed only when Explicit Roles is active. **This PDI never installed that plugin**, so the canonical role is simply absent and cannot be substituted by a same-named record. Admin reaches everything not because it holds the role (verified: `abeyahmad` has zero effective "internal" roles in `sys_user_has_role`) but via the standard admin short-circuit where `gs.hasRole(anything)` is true.

**What this means for reachability in a browser:**

- On **this stripped PDI**, no non-admin can satisfy the gate, so genuinely-gated schemas are dead for devitil.
- On **any real corporate instance** with Explicit Roles (increasingly the default, mandatory under Zero Trust Access), every internal/employee user — including a normal ITIL fulfiller, i.e. exactly the console's typical user — holds the canonical `snc_internal` role and **passes** `requires_snc_internal_role`. The gate is a "you're an internal, non-consumer user" check, not "you're an admin."

**One honest caveat:** I could not obtain the canonical `snc_internal` sys_id (the plugin isn't installed, and I won't fabricate one), and I deliberately did not activate the plugin (it auto-assigns roles instance-wide — not a self-scoped harmless mutation). I also observed the role-membership cache lags. So I never watched a gated root flip `null`→non-null as devitil; the conclusion rests on the contemporaneous hasRole/gate split, the admin-bypass evidence, and the docs, which all point the same way. I removed the grant I added; state is clean.

**And a second, separate surprise the audits turned up — the flag is not reliable in *either* direction.** Empirically, several schemas with `requires_snc_internal_role=true` **did** resolve and return real data for devitil on this very PDI:

- `now/customer360Widget` — devitil got **byte-identical** output to admin (full sys_user card for CHG0030001).
- `now/favoriteArtifacts`, `now/interaction`, `now/informationSessionQueries`, `now/informationSessionTabWorkSpaceSetting`, `now/sessionUser`, `now/helpRequest` — all resolved for devitil despite the flag.

So the `requires_snc_internal_role` column in `sys_graphql_schema` cannot be trusted at face value: on the `now/*` schemas it did not gate the ITIL user at all, while on `snWorkflowStudio`, `snCreatorstudio/*`, `snKmfUi/*`, `snNluStudio`, `snThemeBuilder`, `snDiagramBuilder`, etc. it returned `null`. What actually governs runtime reachability is a combination of (a) the `enforce_acl` ACL if one is set, and (b) per-resolver in-script guards (`UserUtil.hasGraphQLAccess()`, `gs.hasRole('...')`, `canReadApp`, `GlideRecordSecure`). **The only sound way to know if a schema is reachable is to probe it as a non-admin.** The flag lies both ways.

Net for the audit: do not write the 64 flagged schemas off as "admin-only" based on PDI behavior — on the instances this app ships to, an ITIL browser user very likely satisfies the gate. The ones that stay out of reach for ITIL are those gated by an `enforce_acl` ACL requiring a specific functional role (e.g. NLU's `nlu_admin`/`ml_labeler`, dataExtraction's `platform_ml_read`), not by `snc_internal`.

## 3. Genuinely useful to this console

**Almost nothing. Honestly, nothing net-new.** No schema surfaces change/task/CI/journal/audit data, and every schema that is both reachable-as-ITIL and functional duplicates something the console already does through its Table API layer more cheaply. Laid out plainly, the ITIL-reachable candidates and why each fails the "beats the Table API" test:

- **`now/customer360Widget` → `getWidgetData`.** Reproduced as *both* admin and devitil against CHG0030001, byte-identical — it genuinely works for the ITIL user and returns the referenced user's profile card. But it delivers exactly the reference-user fields the console already gets by dot-walking `requested_by.name`, `assigned_to.email`, etc. in the same `sysparm_display_value=all` Table API call it already issues. It's a pure extra round-trip; its differentiators (CSM `accountDetails`/`activeEscalation`) are `null` on change_request.
- **`now/userPreference` → `updateUserPreference`.** The one schema I confirmed *writes* as devitil: I ran `updateUserPreference(name:"wcm.probe.test", value:"hello")` as abel.tuter and the row persisted to `sys_user_preference` (verified by Table API read, then cleaned up). `requires_snc_internal_role` is genuinely false here. But it's write-only (no read-back path — you still Table-API-read the value), and the console's `wcm.windowConfig` already lives in localStorage. Convenience, not capability.
- **`now/sessionUser` → `getMatchingRoles`.** Correctly filtered for the ITIL user (`["itil"]` for devitil vs `["itil","admin","nonexistent_role_xyz"]` for admin — admin passes `hasRole` for *any* string, so you must probe as non-admin). Works, unguarded, portable. But a UI Page already has `window.g_user.hasRole('itil')` client-side for zero network cost.
- **`snKmWsUib/relatedContent` → `getRelatedArticles`.** ITIL-reachable (root non-null for devitil, executes, ACL-filtered) and returns a real KB article with a `kb_article_view` deep-link when pointed at a `kb_knowledge` source. But against `sourceTable:"change_request"` it returns `[]` **even as admin** — no KB relationship is configured OOB — and the console has no KB surface.
- **`snPlaybookExp/playbook` → `getPlaybooksForParentRecord`.** ITIL-reachable and record-scoped; I proved it returns real data (against `sn_vsc_best_practice_configurations`). But `getPlaybooksForParentRecord("change_request", CHG0000024)` = `[]` — no playbook Process Definitions are attached to any change_request on this instance, and the console has no playbook concept.
- **`snSc/serviceCatalog` → `getQuestionDetails` / `submitProducer`.** Schema gates fully open; `getQuestionDetails` returned real data as devitil. But it returns catalog *variable* metadata the console never renders, and `submitProducer` (run a Record Producer end-to-end) is a detour around the Table API the app already uses to create/read change.

If a future version of the console ever grows a "related KB articles" panel or a per-user server-side setting, `relatedContent` and `userPreference` are the two that would already work for the ITIL user without writing a Scripted REST route. Today, neither is worth adopting.

## 4. Interesting for custom ServiceNow apps generally

These won't go in this console but are worth knowing — reusable capabilities and patterns, with honest gating:

- **Base64 attachment content in one call** — `now/dataExtraction.attachmentData(attachmentSysIdList)` returns any attachment's bytes base64-encoded, chunked, up to 5MB per call. Gated behind `platform_ml_read` (ACL `data_extraction`), so admin/ML-role only here.
- **Dependent-dropdown discovery** — `now/dataExtraction.dependentFields` + `dependentFieldValueMappings` enumerate parent→child field dependencies and value maps from `sys_dictionary`/`sys_choice` (verified: incident category→subcategory). Table-agnostic; same ML gate.
- **snc_internal-free per-user preference write** — `now/userPreference.updateUserPreference` persists a preference via `gs.getUser().savePreference` in one ACL-scoped round trip, no table name required. Verified executable by a plain ITIL user.
- **Reference-field → person card** — `now/customer360Widget.getWidgetData` hydrates up to three reference user-fields on any table+sysId into profile cards; ITIL-reachable, no ACL gate at the schema level (inner reads still ACL'd). A hover-card source with no Scripted REST route. Quirk: the `*Fields` projection is a hint, not enforced.
- **Batched role check** — `now/sessionUser.getMatchingRoles(roleNames)` returns the subset the caller holds; zero resolver guards, most portable "am I in role X?" probe over the single endpoint. (Deceptive as admin: passes for any string.)
- **Related KB articles with a portal deep-link** — `snKmWsUib/relatedContent.getRelatedArticles` resolves related KB articles for any table/record with a ready `kb_article_view` link, honoring KB ACLs/user-criteria, callable by ordinary ITIL users. Only returns rows for an actually-configured relationship.
- **Open-schema + resolver-level `GlideRecordSecure` self-gating** — `snPlaybookExp/playbook` ships with `requires_authentication=false`/`requires_snc_internal_role=false` yet each resolver self-gates: `getPlaybooksForParentRecord` uses `new GlideRecordSecure(parentTable)`; `triggerPlaybook` checks `canCreate()||canWrite()` and returns a typed `INSUFFICIENT_PERMISSIONS` union member otherwise. This is the clean pattern to imitate for a record-scoped *action* API (launching a Process Definition) that the Table API can't cleanly replicate.
- **Run a Record Producer, security honored** — `snSc/serviceCatalog.submitProducer` runs a producer end-to-end (variable merge, mandatory/regex/MRVS validation, redirect payload), respecting `canView`. A legitimate way for a browser app to submit a catalog request.
- **Union result types + centralized errors** — `snCreatorstudio/formSubmission` returns `List | Error` unions with a typed `{message, errorType}` in-band instead of throwing, plus a per-app `canReadApp` authorization layer and an `ERROR_TYPES` enum. The most reusable GraphQL design in the set. (Inline fragments must use fully-qualified type names, e.g. `snCreatorstudio_formSubmission_List`.)
- **Effective-CRUD alongside data** — `snNluStudio/nlu`'s test-set resolver returns a `_table_metadata` block `{canRead,canWrite,canCreate,canDelete}` computed from the GlideRecord's own `can*()` methods — a tidy way to hand a client its effective capability so the UI can gate edit affordances. (Same resolver also feeds a raw `queryConditions` string into `addEncodedQuery` on a plain — non-secure — GlideRecord; snc_internal-gated, so not an ITIL escalation path here.)
- **Table-agnostic display-value resolver** — `snDtableDesigner/comparisonDisplayValue.getReferenceDisplayValue` turns any table+sysId into a display string; `getChoiceDisplayValue` resolves choice labels across a table hierarchy with a `missingChoices` array. Both gated by an in-resolver `UserUtil.hasGraphQLAccess()` (admin-only here), and redundant with `sysparm_display_value=all`.
- **`UserUtil.hasGraphQLAccess()` is the real gate on the Decision Table family** — all four `snDecisionTable` builder schemas resolve their *root* for devitil (non-null `*_Query` typename) but return `null` at the *field* because of this in-script guard. "Root resolves" never implies "usable" — you must call a real field to see the guard.
- **Health-rollup schema shape** — `snKmfUi/status` + `resolution` model a recursive component tree with a `RED/YELLOW/GREEN/GRAY` enum (read vs auto-remediate split over one Script Include). Good template for a status widget.
- **"Real user tables only" recipe** — the (deactivated, deprecated) `snMobileCardBui/mcbTableInfo` resolver excludes rotated-table shards by diffing `sys_table_rotation` against `sys_table_rotation_schedule` and drops `sysx_`/`var__`/`ts_` prefixes. Notably, ServiceNow is itself deprecating these GraphQL schemas back to Scripted REST (`sys_ws_definition`) — which validates the console's own choice to use a scoped Scripted REST route for the activity feed.

**Security smells worth flagging when auditing your own scoped GraphQL** (all observed, not hypothetical): state-mutating operations exposed as Query fields, not Mutation (`now/informationSessionQueries` set/update/close; `now/informationSessionTabWorkSpaceSetting` writes the instance-wide `sn_oe_sfs.enable_information_session_tabs` property) — both behind an `enforce_acl` that is roleless (`gs.getSession().isLoggedIn()` only), so any authenticated user can invoke them. And several read resolvers use plain `GlideRecord`, not `GlideRecordSecure`, bypassing row-level ACLs (`snMobileCardBui/mcbMobileUiRules`, the NLU query passthrough). Read `sys_graphql_resolver.script`, not just the schema flags.

## 5. Dead ends

Every schema below is useless to this console — wrong subject matter, and in most cases unreachable by the ITIL browser user too. One line each.

| Schema | What it is | Why useless here |
| --- | --- | --- |
| `now/dataExtraction` | ML training-set extraction | Offline ML tooling; `platform_ml_read`-gated → null for ITIL |
| `now/favoriteArtifacts` | Pin App Engine builder artifacts | Favorites store, not change records; Table API covers any real need |
| `now/helpRequest` | Agent Workspace supervisor-help on interactions | Live-chat supervision; no change data |
| `now/informationSessionQueries` | Omnichannel chat unread-badge state | Chat tab bookkeeping (writes on Query root) |
| `now/informationSessionTabWorkSpaceSetting` | Omnichannel session-tab admin config | Chat feature config; irrelevant |
| `now/interaction` | End/wrap-up a chat interaction | Agent Workspace only; self-scoped to assignee |
| `snAce/formBuilder` | OOB form-view metadata for a table | Console renders its own React UI; snc_internal → null for ITIL |
| `snAesStarterWzd/fetchWorkspaceTable` | Workspace-wizard table picker | Authoring-time tooling; console knows its 4 tables |
| `snAppseePar/appseeParGroupby` | Usage-Insights group-by dimension labels | Product analytics UI config; no change data |
| `snAppseePar/appseeParKpis` | Usage-Insights KPI picker | Static KPI list; extra analytics-role guard → `[]` |
| `snCreatorstudio/automation` | Creator Studio playbook-activity templates + group-member lookup | Authoring metadata; group members come from `sys_user_grmember` |
| `snCreatorstudio/formSubmission` | Creator Studio "Filtered Lists" CRUD | Saved-list-view config for the app builder |
| `snCreatorstudio/requestForm` | Record-producer (catalog form) builder | Catalog-form authoring; snc_internal → null for ITIL |
| `snCreatorstudio/requestApp` | App Engine "request apps" management | App-building console concern; snc_internal → null |
| `snDecisionTable/answerElement` | Decision Table output-column CRUD | Decision Table builder metadata; `hasGraphQLAccess` → null field |
| `snDecisionTable/choiceField` | List choice-type columns of a table | Builder metadata; `sys_dictionary` is the un-gated equivalent |
| `snDecisionTable/decisionAnswer` | Get-or-create answer rows | Write helper for decision tables; mutation-only, guarded |
| `snDecisionTable/decisionChoice` | Choice-option CRUD | Decision Table authoring; mutation-only, guarded |
| `snDecisionTable/decisionTable` | Decision Table record CRUD | Authoring; empty Query, double-gated (`hasDTCrudAccess`) |
| `snDecisionTable/decisionTableUser` | Session role/domain/locale helpers | `g_user` gives role/locale free; guarded fields → null for ITIL |
| `snDecisionTable/referenceChoice` | Choice list for a table+element | Redundant with display values; returns duplicate rows; guarded |
| `snDecisionTable/sysProperties` | Read one system property | `hasGraphQLAccess`-gated → null for ITIL; console needs no props |
| `snDiagramBuilder/BuilderQueries` | Diagram Builder design-time API | Different product; ACL-gated → whole root null for ITIL |
| `snDtableDesigner/comparisonDisplayValue` | Display-value resolver for DT conditions | Redundant with `sysparm_display_value=all`; guarded → null for ITIL |
| `snKmfUi/resolution` | Key-Management-Framework health + auto-remediate | Crypto infra health; snc_internal → null; side-effecting |
| `snKmfUi/status` | KMF plugin health (passive) | Same payload as above; snc_internal → null for ITIL |
| `snMobileCardBui/mcbTableInfo` | Mobile-builder table picker | `active=false` (root undefined for everyone) + deprecated |
| `snMobileCardBui/mcbMobileUiRules` | Mobile UI-rule CRUD | `active=false`; unrelated domain; plain-GlideRecord reads |
| `snMobileCardBui/mcbMobileViews` | Mobile view-template CRUD | `active=false`; mobile-card authoring |
| `snNluStudio/nlu` | NLU / Virtual Agent model authoring | Intents/utterances/entities; snc_internal → null for ITIL |
| `snTelemetryData/telemetryPARGroupby` | Observability group-by dimensions | Telemetry reporting config; snc_internal → null; needs args + data |
| `snWorkflowStudio/workflowStudio` | Flow Designer IDE bootstrap predicates | Feature-flag/role checks; snc_internal → null for ITIL |
| `snThemeBuilder/themeBuilder` | UX Theme Builder CRUD | Brand colors/fonts/logos; snc_internal → null; console forbids raw hex anyway |

## 6. How to call any of them

The practical cookbook, all verified in the course of this audit:

**One endpoint.** There is exactly one GraphQL endpoint — everything is a root field inside it. There is no `/api/<ns>/<schema>` route (that 400s).

```
echo '{"query":"{ now { sessionUser { getMatchingRoles(roleNames:[\"itil\",\"admin\"]) } } }"}' > /tmp/q.json
sn --profile dev421992 --timeout 30 raw POST /api/now/graphql --data @/tmp/q.json
```

**Nested-root addressing.** Scripted schemas are nested roots: `{ <application_namespace> { <schema_namespace> { <field> } } }`, e.g. `{ snWorkflowStudio { workflowStudio { hasRole(role_name:"itil") } } }`. A few legacy schemas expose a flat root (`GlidePromin_Query`) instead — the SDL's `schema{}` block tells you which. Generic table CRUD lives in the separate platform-native `GlideRecord_Query` / `GlideRecord_Mutation` roots, whose `queryConditions` accepts encoded queries *and* `javascript:` expressions (e.g. `user_name=javascript:gs.getUserName()`).

**Read SDL from the table, do not introspect.** Introspection times out (the generic schema has a field per table). Instead:

```
sn --profile dev421992 table list sys_graphql_schema \
  --query "namespace=<ns>" --fields "schema,paths" --setlimit 1
```

`sys_graphql_schema.schema` is the authoritative SDL text; `.paths` is the `Type:field` list. To find which resolver script backs a field, join `sys_graphql_resolver_mapping.path` ("Query:foo") → `sys_graphql_resolver.script`. **Always read the resolver script** — the schema flags (`requires_snc_internal_role`, `requires_acl_authorization`, `enforce_acl`) do not tell you the real guard; in-script `UserUtil.hasGraphQLAccess()` / `gs.hasRole()` / `GlideRecordSecure` / `canReadApp` are frequently the actual gate.

**Learn a mutation's signature without executing it.** Call it with no arguments and read the resulting `MissingFieldArgument` ValidationError — it reveals required args without running the mutation.

**Differential probing is mandatory.** Nothing returns 403. A gated schema returns `null` at its root; an ACL-denied table returns an empty array; genuinely-missing data also returns empty — all three look identical. Run the *same* query as admin and as devitil:

```
sn --profile dev421992 --timeout 30 raw POST /api/now/graphql --data @/tmp/q.json   # admin
sn --profile devitil    --timeout 30 raw POST /api/now/graphql --data @/tmp/q.json   # ITIL
```

If admin gets data and devitil gets `null` root → gated. If both get `[]` → empty/denied, not gated. If devitil's *root* resolves (`*_Query` typename) but a *field* returns `null` → an in-resolver guard, not a schema gate (the Decision Table family behaves exactly this way). And remember: on this PDI the `requires_snc_internal_role` flag is unreliable in both directions — several `now/*` schemas ignore it entirely for the ITIL user, while others honor it — so the differential probe is the only trustworthy signal. Always pass `--profile` explicitly; the env-var default points at a different instance and lies silently.

**Do not deploy anything to learn any of this** — it's all read-only probing against the one endpoint.
