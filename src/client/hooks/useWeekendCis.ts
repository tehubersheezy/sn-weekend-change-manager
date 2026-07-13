import { useEffect, useRef, useState } from 'react'
import type { ChangeService } from '../services/ChangeService'
import type { AffectedCiRecord, ChangeRecord } from '../types'
import { value } from '../utils/fields'

/**
 * Affected CIs for the whole window, for the LLM payload.
 *
 * The detail pane's Affected CIs tab reads one change at a time; this reads all of
 * them, because a CI COLLISION is a fact ABOUT THE WINDOW — two changes contending
 * for one box — and it is invisible from inside either change. It cannot be
 * assembled from per-change reads without N round-trips (see
 * ChangeService.listWeekendAffectedCis, which chunks and parallelizes instead).
 *
 * Keyed off the change sys_ids rather than the array identity: AMB refetches renew
 * `changes` on every work note, and re-reading 110 changes' CIs because someone
 * typed a comment would be absurd. The CI set only moves when the POPULATION does.
 */
export function useWeekendCis(service: ChangeService, changes: ChangeRecord[]): AffectedCiRecord[] {
  const [cis, setCis] = useState<AffectedCiRecord[]>([])
  const seqRef = useRef(0)

  const signature = changes
    .map((c) => value(c.sys_id))
    .sort()
    .join(',')

  useEffect(() => {
    if (!signature) {
      setCis([])
      return
    }
    const seq = ++seqRef.current
    service
      .listWeekendAffectedCis(signature.split(','))
      .then((rows) => {
        if (seq === seqRef.current) setCis(rows)
      })
      .catch(() => {
        // CIs are payload enrichment, not the console's job. A failure here must
        // not break the window — the report simply reasons without them, and the
        // "no affected CIs named" finding degrades gracefully into silence.
        if (seq === seqRef.current) setCis([])
      })
  }, [service, signature])

  return cis
}
