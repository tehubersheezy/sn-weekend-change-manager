import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
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
  service,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: ScreenKey
  payload: WeekendPayload | null
  service: LlmService
}) {
  const { report, run, reset } = useAiReport(service)

  useEffect(() => {
    if (!open || !payload) return
    void run(buildPrompt(screen, payload))
    // Re-running on `screen` is intentional: the action is per-screen, so opening
    // Review after Plan must ask the new question rather than show the old answer.
    // `payload` is excluded — it changes identity on every AMB refetch, and
    // restarting a half-written report because a work note landed would be absurd.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, screen, run])

  // Closing aborts the stream (useAiReport.reset) — a dismissed dialog must not
  // keep generating tokens against a report nobody will read.
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const counts = payload?.counts ?? { changes: 0, tasks: 0, cis: 0, jiras: 0, events: 0 }
  const waiting = report.status === 'generating' && !report.streaming

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
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
