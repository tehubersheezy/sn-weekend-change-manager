import { useEffect, useState } from 'react'
import type { JiraIssueNarrative, JiraService } from '../services/JiraService'

export interface JiraNarratives {
  /** The issues resolved for THIS open. Empty until they land — never a previous open's. */
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
 * EVERY open refetches. The service no longer caches narratives (see
 * JiraService.listNarratives), and `session` below makes the hook ask again even
 * when the key set is byte-for-byte identical to the last report's. Two reports
 * run an hour apart must not be generated from the same Jira — the whole premise
 * of the console is that the weekend is live, and a Jira thread is the part of the
 * payload most likely to have moved while nobody was looking at this tab.
 *
 * `loading` is DERIVED, not written from the effect, and that is the load-bearing
 * detail. AiReportDialog is a CHILD of the component that owns this hook, and React
 * flushes child effects before parent ones — so a `loading` that only turns true in
 * our effect turns true one commit too late, after the dialog's start-effect has
 * already read `payloadPending: false` and fired the report. It did exactly that: the
 * first report of a session was generated against an empty Jira map, and every key in
 * it rendered as "(no issue found for this key)" — a fact, stated with total
 * confidence, that happened to be false. Deriving it closes the window: at the very
 * render where `enabled` flips, we already know we have nothing for this session.
 *
 * Failure resolves rather than rejects (JiraService settles a dead chunk as
 * misses), so a Jira outage costs the report its Jira half and never hangs it.
 */
export function useJiraNarratives(
  service: JiraService,
  keys: string[],
  enabled: boolean,
): JiraNarratives {
  const signature = [...new Set(keys)].sort().join(',')

  // One id per open. Bumped on the false→true edge with the "adjust state during
  // render" pattern rather than in an effect, for the same reason `loading` is
  // derived: an effect-written id is a commit too late to gate the child.
  const [session, setSession] = useState(0)
  const [wasEnabled, setWasEnabled] = useState(enabled)
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled)
    if (enabled) setSession((n) => n + 1)
  }

  // What we're asking for right now: this open, these keys. Empty means "not asking".
  const token = enabled && signature ? `${session}:${signature}` : ''

  // What we HAVE, stamped with the request that produced it. Comparing the two is
  // the whole state machine — no separate loading flag to fall out of sync.
  const [resolved, setResolved] = useState<{ token: string; issues: Map<string, JiraIssueNarrative> }>({
    token: '',
    issues: EMPTY,
  })

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void service.listNarratives(signature.split(',')).then((issues) => {
      if (cancelled) return // a newer open, or a changed key set, superseded this fetch
      setResolved({ token, issues })
    })
    return () => {
      cancelled = true
    }
  }, [service, token, signature])

  const fresh = token !== '' && resolved.token === token
  // Never hand back a map we resolved for a different open. A stale map is worse
  // than an empty one: the report would read it as the truth and say so.
  return { issues: fresh ? resolved.issues : EMPTY, loading: token !== '' && !fresh }
}
