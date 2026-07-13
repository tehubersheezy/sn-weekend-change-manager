import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
import type { ScreenKey } from '../utils/phases'
import type { WeekendPayload } from '../prompts'
import { buildPrompt } from '../prompts'
import type { LlmService } from '../services/LlmService'
import { useAiReport } from '../hooks/useAiReport'
import { AiThinking } from './AiThinking'
import { ReportMarkdown } from './ReportMarkdown'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

/**
 * The weekend report, in a dialog.
 *
 * One dialog serves all three screens because the difference between them is the
 * QUESTION, not the surface (see prompts.ts — the phase is a lens, not a filter).
 * Three dialogs would be three copies of the same loading, error and streaming
 * states, drifting apart at the first bug fix.
 *
 * It generates on open and aborts on close. There is no cache and no re-open of a
 * stale report on purpose: a status report for a window that has moved on is worse
 * than no status report, and the whole point of this console is that the weekend is
 * live.
 */

const TITLES: Record<ScreenKey, string> = {
  plan: 'Implementation plan',
  execute: 'Current status',
  review: 'Post-implementation review',
}

export function AiReportDialog({
  open,
  onOpenChange,
  screen,
  payload,
  payloadPending,
  service,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: ScreenKey
  payload: WeekendPayload | null
  /**
   * True while the window's Jira issues are still being fetched — the one part of
   * the payload that isn't already on screen when the dialog opens.
   */
  payloadPending: boolean
  service: LlmService
}) {
  const { report, run, reset } = useAiReport(service)

  // Which screen's report we have already started, so the effect below can depend
  // on `payload` (it must — it has to read the FINISHED one) without a refetch
  // restarting a stream mid-sentence. Cleared on close.
  const startedRef = useRef<ScreenKey | null>(null)

  useEffect(() => {
    if (!open) {
      startedRef.current = null
      return
    }
    // The prompt is built ONCE, so it must not be built early. A payload whose Jira
    // half has not landed still looks complete — every key is present, merely
    // without its status, description or comments — and a review generated from it
    // will state that nobody wrote anything on any issue, which is a lie told with
    // total confidence. Wait for the fetch this open triggered.
    if (!payload || payloadPending) return
    // Re-running on `screen` is intentional: the action is per-screen, so opening
    // Review after Plan must ask the new question rather than show the old answer.
    if (startedRef.current === screen) return
    startedRef.current = screen
    void run(buildPrompt(screen, payload))
  }, [open, screen, run, payload, payloadPending])

  // Closing aborts the stream (useAiReport.reset) — a dismissed dialog must not
  // keep generating tokens against a report nobody will read.
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  // COPY. The report is Markdown, and Markdown is what people want out of here — it
  // pastes into a change record's close notes, a Confluence page or a Slack message
  // and survives. So the clipboard gets `report.text` verbatim, NOT the rendered DOM:
  // copying the rendered table would hand them a wall of untabbed text.
  //
  // The fallback is not defensive padding. This console runs INSIDE a ServiceNow
  // Polaris iframe, and `navigator.clipboard` rejects in a frame that was not granted
  // `clipboard-write` — a permission we do not control from here. execCommand is
  // deprecated and works in exactly that case, so the button degrades instead of
  // silently doing nothing.
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async () => {
    const text = report.text
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const field = document.createElement('textarea')
      field.value = text
      // Off-screen rather than hidden: a display:none field cannot be selected.
      field.style.position = 'fixed'
      field.style.left = '-9999px'
      document.body.appendChild(field)
      field.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(field)
      }
    }
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [report.text])

  // The confirmation must not outlive the report it confirms: reopening on a fresh
  // report with a stale "Copied" still lit would be a lie about what is on the
  // clipboard.
  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  useEffect(() => () => void (copiedTimer.current && clearTimeout(copiedTimer.current)), [])

  const counts = payload?.counts ?? { changes: 0, tasks: 0, cis: 0, jiras: 0, events: 0 }
  // The Jira fetch is part of "thinking" as far as anyone reading this is concerned;
  // an empty panel while it lands would just look broken.
  const waiting = payloadPending || (report.status === 'generating' && !report.streaming)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {/* The one coral mark on this surface. It says "a model wrote this",
                which is the single most important thing about the panel. */}
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
            {TITLES[screen]}
          </DialogTitle>
        </DialogHeader>

        {/* max-h keeps a long Review report inside the viewport; the dialog scrolls,
            the page behind it never does. */}
        <div className="max-h-[60vh] min-h-[18rem] overflow-y-auto pr-1">
          {waiting ? (
            <AiThinking counts={counts} screen={screen} thinking={report.thinking} />
          ) : report.status === 'error' ? (
            <div className="flex flex-col items-start gap-3 py-8">
              <p className="text-body-sm text-error-ink">{report.error}</p>
              <p className="text-caption text-muted-foreground">
                Check the LLM endpoint and token in Settings, then try again.
              </p>
            </div>
          ) : (
            <ReportMarkdown source={report.text} />
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* What went into the report, stated plainly. A reader must be able to see
              the scope of the evidence without taking the model's word for it. */}
          <p className="text-caption text-muted-foreground tabular-nums">
            {counts.changes} changes · {counts.tasks} tasks · {counts.cis} CIs · {counts.jiras} Jiras
            {payload?.historyTruncated ? ' · history truncated' : ''}
          </p>
          <div className="flex items-center gap-2">
            {/* Only once the report is whole. A half-streamed report on the clipboard
                is worse than no button — it looks complete in the paste. */}
            <Button
              variant="secondary"
              onClick={copy}
              disabled={report.status !== 'done' || !report.text.trim()}
            >
              {copied ? (
                <Check className="size-4 shrink-0 text-success-ink" aria-hidden />
              ) : (
                <Copy className="size-4 shrink-0" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          {/* The label above swaps under the pointer, which a screen reader following
              focus would never hear. Announce it. */}
          <span aria-live="polite" className="sr-only">
            {copied ? 'Report copied to clipboard' : ''}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
