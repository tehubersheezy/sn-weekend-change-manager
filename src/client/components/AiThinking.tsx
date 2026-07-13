import { useEffect, useRef, useState } from 'react'

/**
 * The generating state of the AI report dialog. It fills a `DialogContent` for
 * 10-30 seconds while a language model reads the whole weekend window, and it is
 * the most-stared-at surface in the feature: the user is doing nothing else.
 *
 * DESIGN.md > Motion forbids "a spinner replacing content" and rules that motion
 * conveys state, never decoration. The owner has asked for an animated thinking
 * state anyway, so the rule is not ignored, it is SATISFIED — the panel is built
 * so that everything it shows is true:
 *
 *   1. THE MANIFEST. The counts are the real payload we just sent. Presented as a
 *      list, never a sequence: nothing ticks or lights up in turn, because the model
 *      reads all of it in one pass and a per-row illumination would be the fake-stage
 *      lie wearing the honest design's clothes.
 *   2. THE REASONING. The model's OWN summarized thinking, streamed live. This panel
 *      was first built without it, on the assumption that the model reports nothing
 *      back — and the copy then had to say "there are no stages to report". That
 *      assumption was wrong: LlmService asks for `thinking.display: 'summarized'`, so
 *      the model narrates itself. Fabricated stages were never needed; the real ones
 *      were one API flag away.
 *   3. THE CLOCK. Elapsed seconds, and nothing more. There is no progress bar and
 *      never will be: the model reports no percentage, and inventing one is exactly
 *      the fabrication this panel exists to refuse.
 *
 * The single kinetic accent is a warm band drifting through the serif headline
 * (`thinking-sweep` + `animate-thinking-sweep` in theme.css). It rides the one line
 * that says what is happening, so it is the state made visible rather than an
 * ornament beside it, and it expresses the honest thing: indeterminate, alive,
 * unhurried. Under prefers-reduced-motion it vanishes and the headline is simply
 * still ink — the panel loses no information, because the sweep was never carrying
 * any. See DESIGN.md > Interaction: Hover & Motion > Motion.
 *
 * Renders INSIDE an open DialogContent. No dialog, title or close button of its own.
 */

export interface AiThinkingProps {
  /** Real counts from the payload we just sent. Drive the copy off these. */
  counts: { changes: number; tasks: number; cis: number; jiras: number; events: number }
  /** Which report is generating — use for the headline verb. */
  screen: 'plan' | 'execute' | 'review'
  /**
   * The model's OWN summarized reasoning, streamed live (LlmService sets
   * `thinking.display: 'summarized'`; the API default is `'omitted'`, which streams
   * thinking blocks with empty text and would make this permanently blank).
   *
   * This is the signal this panel was originally built without. It is not a stage we
   * invented and not an estimate — it is the model saying what it is working on, in
   * its own words, and it is therefore the most honest thing on the surface.
   */
  thinking?: string
}

type CountKey = keyof AiThinkingProps['counts']

/**
 * The verb is the truth: before the first token the model is READING, after it the
 * model is WRITING. Those are the only two things we actually know, so they are the
 * only two headlines there are.
 */
const READING: Record<AiThinkingProps['screen'], string> = {
  plan: 'Reading the weekend ahead',
  execute: 'Reading the window in flight',
  review: 'Reading the weekend just past',
}

/**
 * What the model was ASKED for. This is honest even though the model reports nothing
 * back: it is our prompt, restated. It is not a claim about what the model is doing
 * right now — that would be the fake-stage lie.
 */
const ASKED: Record<AiThinkingProps['screen'], string> = {
  plan: 'Looking for collisions, gaps and risk across everything scheduled.',
  execute: 'Looking at what is moving, what is stalled and what is at risk right now.',
  review: 'Looking at what landed, what slipped and what to carry forward.',
}

/**
 * The manifest. Presented as a list, not a sequence: the model reads all of it in
 * one pass, so nothing here ever ticks, completes, or lights up in turn.
 */
const STRATA: { key: CountKey; one: string; many: string }[] = [
  { key: 'changes', one: 'change', many: 'changes' },
  { key: 'tasks', one: 'change task', many: 'change tasks' },
  { key: 'cis', one: 'affected CI', many: 'affected CIs' },
  { key: 'jiras', one: 'Jira issue', many: 'Jira issues' },
  { key: 'events', one: 'activity event', many: 'activity events' },
]

/** Past this, "usually 10-30 seconds" has stopped being true and we say so. */
const LONG_WAIT_SECONDS = 30

/**
 * The tail of the model's reasoning — the part it is on NOW.
 *
 * The summarized stream runs to paragraphs over a 30-second wait, and a panel that
 * grew a wall of prose would bury its own manifest. Taking the last complete-ish
 * sentence keeps the line a live readout rather than a transcript, and keeps the
 * panel's height stable while the words underneath it change.
 */
function currentThought(thinking: string): string {
  const trimmed = thinking.trim()
  if (!trimmed) return ''
  // Split on sentence ends, keep the last non-empty fragment. A half-written final
  // sentence is exactly what we want — it is where the model actually is.
  const parts = trimmed.split(/(?<=[.!?])\s+/)
  return parts[parts.length - 1] ?? trimmed
}

export function AiThinking({ counts, screen, thinking = '' }: AiThinkingProps) {
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // The dialog swaps to the report itself the instant the first prose token lands,
  // so this component only ever exists in the READING half of the wait. There is no
  // "writing" state to render here — it would flash for a frame and then unmount.
  const headline = READING[screen]

  // Zero strata are omitted rather than shown as "0". The manifest lists what was
  // SENT; a row of noughts is noise, and an empty window is a degenerate case the
  // prose has to handle anyway.
  const strata = STRATA.filter((s) => counts[s.key] > 0)

  const thought = currentThought(thinking)

  const clock =
    elapsed > LONG_WAIT_SECONDS
      ? `${elapsed}s · a window this size can run long`
      : `${elapsed}s · usually 10–30s`

  // One stable sentence for assistive tech. The visible clock is aria-hidden and the
  // reasoning line is NOT a live region: both change constantly, and a live region
  // that re-announces every second is a denial of service, not an accessibility
  // feature. The report itself is what gets announced, when it arrives.
  const announcement = `Generating the ${screen} report from ${strata
    .map((s) => `${counts[s.key]} ${counts[s.key] === 1 ? s.one : s.many}`)
    .join(', ')}. This usually takes 10 to 30 seconds.`

  return (
    <div className="flex flex-col gap-6 py-2">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <div className="flex flex-col gap-2">
        {/*
          A <p>, not an <h*>: DialogTitle already owns the heading level, and this
          line narrates the wait rather than titling the artifact. The base layer
          only gives the serif face to h1/h2/h3, so font-display is stated here —
          forgetting it is the classic silent miss in this codebase.

          The sweep is a second copy of the same words, absolutely positioned over
          the first, painted only where the travelling band crosses them
          (background-clip: text). The ink text underneath is the real, selectable,
          accessible one; the overlay is inert and aria-hidden, so a screen reader
          never hears the headline twice and reduced motion simply drops it.
        */}
        <p className="relative font-display text-display-sm text-ink">
          {headline}
          <span
            aria-hidden="true"
            className="thinking-sweep animate-thinking-sweep pointer-events-none absolute inset-0 select-none"
          >
            {headline}
          </span>
        </p>
        <p className="text-body-md text-body-text">{ASKED[screen]}</p>
      </div>

      {/*
        The model's own reasoning, live. This is the line the panel was originally
        built without — and it is why the copy no longer claims "there are no stages
        to report". There ARE stages; the model tells us what they are. We are not
        guessing, not estimating, and not narrating on its behalf.

        It sits in the muted voice on purpose: it is the model thinking out loud, not
        the report. The reader should be able to ignore it entirely and lose nothing.
        min-h holds the panel's height steady as the sentence underneath changes, so
        the manifest below never jumps.
      */}
      {thought && (
        <p className="min-h-[2.5rem] text-body-sm italic leading-relaxed text-muted-foreground">
          {thought}
        </p>
      )}

      {strata.length > 0 && (
        <div className="rounded-lg bg-surface-card p-6">
          <p className="text-caption text-muted-foreground">Already in the model’s hands</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {strata.map((s) => {
              const n = counts[s.key]
              return (
                <li key={s.key} className="flex items-baseline gap-4">
                  {/*
                    Serif numerals are blessed for stats (DESIGN.md > Note on
                    display-xs). tabular-nums is what aligns the column — this app
                    has no monospace, and never will.
                  */}
                  <span className="w-16 shrink-0 text-right font-display text-display-xs tabular-nums text-ink">
                    {n}
                  </span>
                  <span className="text-body-sm text-body-text">{n === 1 ? s.one : s.many}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-6">
        <p className="text-caption text-muted-foreground">
          It reads the whole window before it writes a word.
        </p>
        {/*
          Elapsed time, not progress. There is still no percentage here and there
          never will be — the model does not report one, and inventing one would be
          the exact fabrication this panel was built to avoid. aria-hidden because it
          ticks; the sr-only status line above carries the same news once, calmly.
        */}
        <p aria-hidden="true" className="shrink-0 text-caption tabular-nums text-muted-foreground">
          {clock}
        </p>
      </div>
    </div>
  )
}
