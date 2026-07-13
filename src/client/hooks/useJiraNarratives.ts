import { useEffect, useRef, useState } from 'react'
import type { JiraIssueNarrative, JiraService } from '../services/JiraService'

export interface JiraNarratives {
  issues: Map<string, JiraIssueNarrative>
  /** True while a fetch is in flight. The report waits on this — see AiReportDialog. */
  loading: boolean
}

const EMPTY: Map<string, JiraIssueNarrative> = new Map()

/**
 * Batch-resolves Jira keys to issues WITH their descriptions and comment threads,
 * for the AI report and nothing else.
 *
 * `enabled` is what makes this affordable. Unlike useJiraSummaries — which feeds
 * badges the console always paints, and so always fetches — nothing on screen
 * renders a Jira description. Fetching comment threads for a whole weekend on
 * every page load would put a synchronous Jira callout in front of a console most
 * of whose users never open the report. So this fires when the report opens, and
 * the report waits for it.
 *
 * That wait is the point. The prompt is built once, and a report generated from a
 * half-loaded payload would tell someone their Jira issues have no comments —
 * which is a fact, confidently stated, that happens to be false. `loading` starts
 * true the moment the report is enabled with keys to resolve, so there is no
 * window in which the payload looks complete and isn't.
 *
 * Failure resolves rather than rejects (JiraService settles a dead chunk as
 * misses), so a Jira outage costs the report its Jira half and never hangs it.
 */
export function useJiraNarratives(
  service: JiraService,
  keys: string[],
  enabled: boolean,
): JiraNarratives {
  const [issues, setIssues] = useState<Map<string, JiraIssueNarrative>>(EMPTY)
  const signature = [...new Set(keys)].sort().join(',')
  const seqRef = useRef(0)

  // Not derived from `issues.size`: an empty result from a real fetch is
  // indistinguishable from never having fetched, and the report would generate
  // against nothing while claiming to be complete.
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !signature) {
      setLoading(false)
      return
    }
    const seq = ++seqRef.current
    setLoading(true)
    void service.listNarratives(signature.split(',')).then((resolved) => {
      if (seq !== seqRef.current) return // a newer resolve superseded this one
      setIssues(resolved)
      setLoading(false)
    })
  }, [service, signature, enabled])

  return { issues, loading }
}
