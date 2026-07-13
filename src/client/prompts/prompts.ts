import type { ScreenKey } from '../utils/phases'
import { renderPayload, type WeekendPayload } from './payload'

/**
 * The three weekend prompts, one per screen.
 *
 * They are keyed by ScreenKey deliberately. The console already has exactly three
 * phases (utils/phases.ts) and each asks a different question of the same window:
 * Plan asks "what are we about to do", Execute asks "where are we right now",
 * Review asks "what happened". Those are the three prompts. Keying them by
 * anything else would create a fourth vocabulary to keep in step with the first.
 *
 * Every prompt receives the SAME complete payload — the whole window's changes,
 * their history, their tasks and their Jiras. What differs is the question asked
 * of it. Slicing the payload per phase was the obvious alternative and it is
 * wrong: Review needs the planned dates to judge overrun, Plan needs the history
 * to know an "approved" change was rejected twice first, and Execute needs both.
 * The phase is a lens, not a filter.
 */

export interface Prompt {
  system: string
  user: string
}

/**
 * Grounding rules shared by all three. Most of these exist because of a specific
 * way a model gets a change window wrong.
 */
const SYSTEM = `You are a change manager's assistant for a weekend change window on ServiceNow.

You will be given the complete window: every change request, its change tasks, the
configuration items (CIs) each change affects, the Jira issues those tasks depend on,
and the history of comments, work notes and state transitions across all of it.

Ground rules:

- Use ONLY the payload. Never invent a change number, task number, Jira key, person,
  date, system or configuration item. If you need a fact the payload does not carry,
  say that it is not available rather than supplying a plausible one.
- Cite records by number (CHG0030001, CTASK0010009, NET-4451) whenever you make a
  claim about them, so every statement can be checked against the console.
- Absence of evidence is not evidence of absence. A change with no history may have
  had no activity, or may have had its history truncated — if the payload says the
  history was capped, treat quiet records as unknown, not as calm.
- All times are already in the window's timezone. Do not convert them, and do not
  attach a different zone to them.
- Distinguish what the records SAY from what you infer. "CHG0030004 has no backout
  plan" is a fact. "CHG0030004 is risky" is a judgement — mark it as yours.
- Be concrete and short. A change manager reads this while the window is open. Lead
  with what they must act on; put reasoning after it, not before.

Formatting:

- USE A TABLE whenever you are stating the same few facts about several records —
  counts by state, changes against their planned and actual times, collisions, a
  ranked list of opportunities. A run of numbers written as prose or as bullets is
  the thing this report gets wrong most often: it makes the reader hold a column in
  their head. Put it in a table and let them scan it.
- Tables are GitHub-flavoured Markdown pipe tables. Right-align every numeric column
  by ending its delimiter with a colon (\`--:\`) — that is what makes the digits line
  up. Keep tables to 3–5 columns and one line per cell: this renders in a pane that
  is half the screen, and a paragraph inside a cell defeats the point of the table.
- USE PROSE for anything that is reasoning, judgement, cause or narrative. A table
  can say a change overran by 90 minutes; only a sentence can say why, and why is
  usually the part that matters. Lead a section with the table, then explain beneath
  it. Never make a table do an argument's job.
- Bullets are for short parallel points that are not a table. Headings mark sections.`

/**
 * PLAN — the runbook.
 *
 * The useful output here is not a restatement of the schedule (the console already
 * draws that, in a Gantt). It is the two things a list cannot show: what COLLIDES,
 * and what is NOT READY.
 *
 * Collisions come in two kinds and the CI one is the sharper of the two. Two changes
 * overlapping in time on the same assignee is a person double-booked — annoying, and
 * reschedulable. Two changes overlapping in time on the same CI are contending for
 * one box, and that is how a weekend takes down production. Neither is visible by
 * reading the schedule, because the schedule sorts by time and these collide across
 * it. Both are now derivable here.
 */
const PLAN = `Produce the implementation plan for this weekend — the runbook the change
manager will work from when the window opens.

Cover, in this order:

1. THE SHAPE OF THE WEEKEND. Two or three sentences: how many changes, over what
   hours, concentrated in which groups, carrying what risk. Enough that someone who
   has not looked at the board knows what they are walking into.

2. THE SEQUENCE. Walk the window in planned-start order. Group changes that run
   together into blocks of time rather than listing all of them one by one — name
   the changes that matter (high risk, long running, many tasks, blocking others)
   and summarise the routine bulk. Note where a change's tasks imply an internal
   order.

3. COLLISIONS. These are invisible in a schedule, because a schedule sorts by time and
   collisions hide across it. Report both kinds, CI collisions first:

   - CI COLLISIONS. Two changes whose planned windows overlap AND which name the same
     affected CI are contending for one system. Table them: the CI, both change
     numbers, and the overlapping hours (right-aligned). Treat this as the most
     serious finding in the document — it is how a weekend takes production down —
     and do not soften it. Under the table, say in prose what each collision would
     actually do if it went wrong.
   - PEOPLE COLLISIONS. Two changes whose planned windows overlap AND which share an
     assignee or an assignment group mean someone is double-booked. Same table shape:
     the person or group, both changes, the overlapping hours.

   Also flag any change acting on a CI that is not Operational, and any single CI that
   several changes touch across the weekend even where the windows do not overlap —
   that is a concentration of risk on one system, which is worth knowing even when it
   is not a conflict.

4. NOT READY. For each change that is not ready to execute, say what is missing:
   - no implementation plan, no backout plan, or no test plan
   - still in Assess or Authorize (not yet Scheduled — it cannot run)
   - no assignee or no assignment group
   - no affected CIs named at all (nobody knows what this change touches)
   - a Jira issue it depends on that is not Done
   - a history showing a rejection or a rollback that was never resolved
   Table it — change, planned start, what is missing — ordered by how close the change
   is to its start time, so the top row is the most urgent. Where one change is missing
   several things, list them in the one cell, comma-separated; do not give it a row per
   gap. Anything that needs an argument rather than a fact goes in prose below.

5. GO / NO-GO. Your recommendation, and the specific conditions that would change it.`

/**
 * EXECUTE — the status report.
 *
 * The only prompt whose answer depends on WHEN it is asked, so it is anchored hard
 * to the payload's assembly time. The two derivable schedule facts a human misses
 * while the window is open — a change past its planned end that hasn't closed, and
 * a change past its planned start that hasn't begun — are what this asks for first.
 */
const EXECUTE = `Report the current status of the weekend, as of the payload's assembly time.

Anchor everything to that time: it is "now". A planned end that is in the past
relative to it, on a change that is not Closed or in Review, is an OVERRUN. A planned
start in the past on a change still in Scheduled is a LATE START. Say so.

Cover, in this order:

1. THE HEADLINE. One or two sentences. Is the weekend on track, and if not, why not.
   Someone reading only this line should learn the single most important thing.

2. WHERE EVERYTHING IS. A table of counts by state — done (Closed or Review), in
   flight (Implement), not started (Scheduled) — with the count right-aligned. Then a
   second table of the in-flight changes specifically: change, what it is, assignee,
   planned end, and how far through its tasks it is (right-align that, e.g. 3/5). The
   in-flight table is the one a change manager will keep coming back to; make it the
   easiest thing on the page to read.

3. OFF THE RAILS. Table every overrun and every late start: change, what it is, the
   planned time, and a right-aligned column for how far past it we now are. Then, in
   prose, anything the history says is in trouble — work notes or comments describing
   a failure, a rollback, an escalation, a blocker, a dependency that did not land.
   Quote the work note briefly and cite it. That half stays prose: a quotation in a
   table cell is unreadable, and it is the part the change manager must actually act on.

4. NEXT UP. What starts in the coming hours. For each, say whether anything in section
   3 puts it at risk — and check the CIs specifically: a change about to start against
   a CI that an in-flight or overrunning change is still holding is the single most
   likely way tonight goes wrong. Name the CI and both changes.

5. NEEDS A DECISION NOW. The things a change manager must act on in the next hour, or
   "nothing" if the window is genuinely clean. Do not manufacture urgency.`

/**
 * REVIEW — the post-implementation review.
 *
 * The whole value here is the gap between what was PLANNED and what HAPPENED, and
 * the payload is the only place both halves sit side by side: the planned dates and
 * plan text from the change, the outcome in close_code / close_notes, and the real
 * course of events in the history. It is also the one prompt that should be
 * comfortable saying the weekend went fine.
 *
 * AUTOMATION OPPORTUNITIES is the one section that is not about this weekend. It
 * asks the question a change manager structurally cannot answer for themselves:
 * what did we do over and over? They experience the weekend one ticket at a time,
 * and repetition across a hundred changes is invisible from inside it — but the
 * payload holds every change at once, so frequency is simply countable here.
 *
 * It carries one trap, and the prompt names it. The change list is COMPLETE; the
 * history is not (`historyTruncated`, when the event stream returns at its cap).
 * So counting changes is evidence and counting work notes is not — a model ranking
 * "how often does this happen" off the notes would be ranking the visible tail by
 * recency and calling it frequency.
 */
const REVIEW = `Write the post-implementation review for this weekend, now that the window
has closed.

You have both halves of the story: what each change PLANNED to do (its planned window,
implementation plan, backout plan, test plan) and what actually HAPPENED (its close
code, close notes, final state, and its history of work notes and transitions). The
review lives in the gap between them.

Cover, in this order:

1. OUTCOME. Open with a table of the counts — one row per outcome (closed successful,
   closed unsuccessful, backed out, still open, cancelled), a right-aligned count
   column, and a share-of-total column. Then, in a second table, the changes that did
   NOT close cleanly: change number, what it was, close code, affected CIs. Two or
   three sentences underneath saying what those numbers add up to.

2. WHAT DID NOT GO TO PLAN. For each change that failed, was backed out, overran its
   planned window, or closed with a non-successful close code: what was supposed to
   happen, what happened instead, and what the history shows about why. Name the CIs
   it affected — those are the systems that took the impact, and they are what anyone
   reading this review on Monday actually wants to know. Cite the work notes. This is
   the core of the review — give it the most room.

3. LOOSE ENDS. Work that is still open now that the window has closed: changes not in
   Closed or Review, change tasks still open on closed changes, Jira issues that are
   still not Done. Each of these is someone's Monday morning.

4. TIMELINE. How the weekend ran against its plan. Table it: change, planned window,
   what actually happened, and a right-aligned column for how far it slipped. One row
   per change that started or finished materially late — not every change in the
   window. Underneath, in prose, say whether the overruns cascaded into each other,
   which is the thing the table cannot show.

5. AUTOMATION OPPORTUNITIES. Where the weekend spent people on work that did not need
   them. This is the one section that is not about this weekend — it is about making
   the next one smaller — so every item must still be grounded in records from this
   one. Propose nothing the payload does not evidence.

   Look for:

   - REPETITION. The same work done many times over: changes or tasks that share a
     short description, an implementation plan, or an obvious shape of work, across
     different CIs, assignees or groups. Give the count and name three or four
     representative records. Frequency is your strongest signal and it is the one
     thing a change manager cannot see for themselves — they live the weekend one
     ticket at a time, and a pattern spread across a hundred changes is invisible
     from inside it.
   - WORK THAT NEVER FAILS. Repeated work that closed successfully every time, with
     no work notes describing a decision, a surprise or an intervention. That is a
     candidate for a standard change template or a scheduled job: the approvals and
     the hand-execution are buying no safety.
   - TOIL IN THE WORK NOTES. Notes describing a person doing what a script does
     better — verifying by hand, restarting a service, watching a dashboard, copying
     config between boxes, waiting for someone to be available. Quote the note.
   - PREVENTABLE FAILURE. Anything in section 2 that a pre-flight check would have
     caught before the window ever opened: work against a CI that was already
     Non-Operational, a change with no backout plan, a Jira dependency that was not
     Done when the change started. The automation here is a gate, not a robot.

   Lead the section with a table, ordered by frequency × effort saved and not by how
   interesting the idea is: what to automate, how many records it covers (right-align
   that column — it is the ranking, and it should be scannable at a glance), the
   evidence, and roughly how hard it looks. Then take the top two or three in prose
   and say what automating them would actually change about next weekend. The table
   ranks; the prose argues.

   Two ways to get this section wrong. First, COUNT THE RIGHT THINGS: the payload
   holds every change and every task, so counting those is evidence — but if it says
   the history was capped, do NOT treat work-note frequency as evidence of how often
   something happens. You would be counting the most recent notes and calling it a
   pattern. Second, work that FAILED, or that needed a human judgement call, is
   evidence AGAINST automating it. Say so where you see it. The instinct to automate
   the thing that just went wrong is exactly backwards — that is the work that earned
   its human.

6. FOLLOW-UPS. Concrete actions arising from THIS weekend, each tied to the change or
   task that generated it — unfinished work, repairs, things to chase on Monday. Do
   not restate section 5 here; structural and recurring fixes belong there and should
   be said once. Separate what must be done from what would merely be an improvement.
   If the weekend genuinely went well, say so plainly and keep this section short — a
   clean weekend does not need invented lessons.`

const INSTRUCTIONS: Record<ScreenKey, string> = {
  plan: PLAN,
  execute: EXECUTE,
  review: REVIEW,
}

/**
 * The prompt for a screen, with the window's full payload attached.
 *
 * The payload goes AFTER the instruction. That ordering is not cosmetic: the payload
 * is by far the longest part of the message (a busy window runs to tens of thousands
 * of tokens), and a question asked before the data is a question the model reads
 * while it reads the data, rather than one it has to recall afterwards.
 */
export function buildPrompt(screen: ScreenKey, payload: WeekendPayload): Prompt {
  return {
    system: SYSTEM,
    user: `${INSTRUCTIONS[screen]}\n\n---\n\n${renderPayload(payload)}`,
  }
}
