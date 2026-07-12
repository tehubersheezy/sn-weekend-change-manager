# Weekend Change Console

## Register

product — app UI. Design serves the workflow; every screen has a primary task.

## Users & Purpose

Two audiences, equal weight:

- **Change managers / coordinators** running the weekend window as a command center: what's coming, what's in flight, what finished, what's at risk. Ambient use across Fri 5 PM – Sun midnight, often glanced at rather than studied.
- **Implementers / on-call engineers** executing their own changes and tasks: find my change, see its plans, work the task list, mark progress.

The console reads ServiceNow `change_request`/`change_task` data live (AMB record watchers — no manual refreshing during a shift) scoped to a selectable weekend window (default Fri 5:00 PM → Sun 11:59 PM ET).

## Brand Personality

Calm, editorial, precise. The interface should feel like a considered publication about the weekend's work, not a NOC alarm board — confidence without urgency theater. Follows the Claude-inspired DESIGN.md at the repo root: warm cream canvas, serif display headlines (weight 400, negative tracking), coral reserved for primary actions and small accents, hairline borders, color-block depth over shadows.

## Anti-references

- NOC/SOC dashboards: red/black alarm walls, blinking severity, dense grids of gauges.
- Generic SaaS admin: cool grays, blue accents, shadowed white cards.
- Anything monospace — the owner rejects mono type in all circumstances (record numbers, timestamps, code/plan panels included).

## Strategic principles

- **Change tasks carry the work.** Task lists and their progress get visual priority in the detail pane; plans (implementation/backout/test) stay quiet and reference-like.
- **State is the primary lens.** Lifecycle state drives screens (Plan / Execute / Review), filters, badges, and the timeline's validated status palette.
- **Live means quiet.** AMB updates refetch silently in place — no skeleton flashes, no toasts for routine movement; the Live dot in the nav is the only telemetry chrome.
- **Data honesty.** Times are ET wall-clock, stored-UTC correctness is non-negotiable; charts follow the dataviz method (validated palettes, labeled identity, recessive axes).

## Accessibility

Keyboard operable — every row that opens something is reachable and has a visible focus state: a 2px full-strength coral ring at a 2px canvas offset (3.1:1 on cream, clearing WCAG 2.4.11). Coral *at 15% alpha* is a halo, not an indicator — it measures 1.16:1 and is only legible paired with the coral border of `text-input-focused`; this doc used to promise it, and the app shipped an invisible focus state for it.

Status pills take a `-ink` label on their tinted fill (≥4.5:1) — the light semantic hues are fills, not text colors. Chart palettes are validated for CVD separation and ≥3:1 contrast against the cream surface. Identity is never color-alone.
