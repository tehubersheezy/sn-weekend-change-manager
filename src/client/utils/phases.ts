import type { WeekendWindow } from './weekendWindow'

export type ScreenKey = 'plan' | 'execute' | 'review'

export interface PhaseDef {
  key: ScreenKey
  /** TopNav menu label. */
  label: string
  /** Serif headline for the screen header. */
  headline: string
  /** change_request state values shown on this screen. */
  states: Set<string>
}

/**
 * The three top-level screens. Scheduled (-2) intentionally appears in both
 * Plan (as the planning object) and Execute (as the up-next queue).
 */
export const PHASES: PhaseDef[] = [
  { key: 'plan', label: 'Plan', headline: 'Planning this weekend', states: new Set(['-4', '-3', '-2']) },
  // Execute keeps Review/Closed visible — work completing during the weekend
  // stays on the board rather than vanishing mid-shift.
  { key: 'execute', label: 'Execute', headline: 'Executing this weekend', states: new Set(['-1', '-2', '0', '3']) },
  { key: 'review', label: 'Review', headline: 'Weekend review', states: new Set(['0', '3']) },
]

export function phaseByKey(key: string | null): PhaseDef | undefined {
  return PHASES.find((p) => p.key === key)
}

/**
 * Where to land with no explicit ?screen=: Execute during the window, Review
 * after it ends, Plan before it starts.
 */
export function defaultScreen(window: WeekendWindow, now: Date = new Date()): ScreenKey {
  if (now.getTime() > window.endLocal.getTime()) return 'review'
  if (now.getTime() >= window.startLocal.getTime()) return 'execute'
  return 'plan'
}
