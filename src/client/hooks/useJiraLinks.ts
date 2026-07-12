import { useEffect, useRef, useState } from 'react'
import type { JiraService } from '../services/JiraService'

/**
 * Resolves Jira keys to browse links via the scoped scripted REST API.
 *
 * The keys are collapsed into a sorted signature string so the effect refires
 * when the *set* of keys changes, not on every render's fresh array identity —
 * the feed rebuilds its key list on each AMB-driven refetch.
 */
export function useJiraLinks(service: JiraService, keys: string[]): Map<string, string> {
    const [links, setLinks] = useState<Map<string, string>>(new Map())
    const signature = [...new Set(keys)].sort().join(',')
    const seqRef = useRef(0)

    useEffect(() => {
        if (!signature) {
            setLinks(new Map())
            return
        }
        const seq = ++seqRef.current
        void service.resolve(signature.split(',')).then((resolved) => {
            if (seq === seqRef.current) setLinks(resolved) // a newer resolve superseded this one
        })
    }, [service, signature])

    return links
}
