import { useEffect, useRef, useState } from 'react'
import type { JiraIssueSummary, JiraService } from '../services/JiraService'

/**
 * Batch-resolves Jira keys to issue summaries via the scoped scripted REST API,
 * for surfaces that render many keys at once (the Jiras tab, the activity feed).
 *
 * The keys are collapsed into a sorted signature string so the effect refires
 * when the *set* of keys changes, not on every render's fresh array identity —
 * the feed rebuilds its key list on each AMB-driven refetch.
 *
 * Summaries are decoration: a key with no summary still renders as a key, so a
 * failed resolve costs a badge, never a row. JiraService settles unknown keys as
 * misses, so this never re-requests a key that came back empty.
 */
export function useJiraSummaries(
  service: JiraService,
  keys: string[],
): Map<string, JiraIssueSummary> {
  const [summaries, setSummaries] = useState<Map<string, JiraIssueSummary>>(new Map())
  const signature = [...new Set(keys)].sort().join(',')
  const seqRef = useRef(0)

  useEffect(() => {
    if (!signature) {
      setSummaries(new Map())
      return
    }
    const seq = ++seqRef.current
    void service.listSummaries(signature.split(',')).then((resolved) => {
      if (seq === seqRef.current) setSummaries(resolved) // a newer resolve superseded this one
    })
  }, [service, signature])

  return summaries
}
