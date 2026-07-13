import { useCallback, useRef, useState } from 'react'
import type { LlmService } from '../services/LlmService'
import type { Prompt } from '../prompts'

export type ReportStatus = 'idle' | 'generating' | 'done' | 'error'

export interface AiReport {
  status: ReportStatus
  /** The report so far. Grows as it streams; complete once status is 'done'. */
  text: string
  /**
   * The model's own summarized reasoning, latest first line. Shown while we wait —
   * it is the only honest progress signal that exists (there is no percentage to
   * report, and inventing one would be a lie).
   */
  thinking: string
  /** True once the first ANSWER token lands — the moment the wait becomes a read. */
  streaming: boolean
  error: string | null
}

const IDLE: AiReport = { status: 'idle', text: '', thinking: '', streaming: false, error: null }

/**
 * Owns one weekend report: run it, stream it, cancel it.
 *
 * Cancellation is not a nicety here. A report is 10–30 seconds of generation, and
 * the dialog can be dismissed at any point in it — an un-aborted stream would keep
 * billing tokens and keep calling setState into an unmounted tree. Closing the
 * dialog aborts, and so does starting a second report before the first finishes.
 */
export function useAiReport(service: LlmService) {
  const [report, setReport] = useState<AiReport>(IDLE)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const reset = useCallback(() => {
    cancel()
    setReport(IDLE)
  }, [cancel])

  const run = useCallback(
    async (prompt: Prompt) => {
      cancel() // supersede any report still in flight
      const controller = new AbortController()
      abortRef.current = controller

      setReport({ status: 'generating', text: '', thinking: '', streaming: false, error: null })

      try {
        await service.streamReport(
          prompt,
          (delta) => {
            if (controller.signal.aborted) return
            setReport((prev) => {
              if (delta.kind === 'thinking') {
                return { ...prev, thinking: prev.thinking + delta.text }
              }
              // First answer token: the wait is over, even though generation isn't.
              return { ...prev, text: prev.text + delta.text, streaming: true }
            })
          },
          controller.signal,
        )
        if (controller.signal.aborted) return
        setReport((prev) => ({ ...prev, status: 'done', streaming: false }))
      } catch (err) {
        // An abort is a user action, not a failure — it must not paint an error.
        if (controller.signal.aborted) return
        setReport((prev) => ({
          ...prev,
          status: 'error',
          streaming: false,
          error: err instanceof Error ? err.message : 'Failed to generate the report',
        }))
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [service, cancel],
  )

  return { report, run, reset, cancel }
}
