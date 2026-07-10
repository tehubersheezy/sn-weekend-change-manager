/**
 * A change plan (implementation / backout / test) as a quiet soft-cream panel —
 * deliberately recessive next to the change tasks, which carry the actual work.
 * Renders nothing when there is no content.
 */
export function PlanCard({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null
  return (
    <div className="rounded-lg bg-surface-soft p-5">
      <div className="text-xs font-medium uppercase tracking-[1.5px] text-muted-foreground">
        {label}
      </div>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-body-text">
        {text}
      </pre>
    </div>
  )
}
