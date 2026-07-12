/**
 * A change plan (implementation / backout / test) as a quiet soft-cream panel —
 * deliberately recessive next to the change tasks, which carry the actual work.
 * Renders nothing when there is no content.
 *
 * The body is a <div> with `whitespace-pre-wrap`, never a <pre>: Tailwind's
 * preflight paints a mono family onto every <pre>/<code>/<kbd>/<samp> with no
 * class involved, and this product ships no monospace (DESIGN.md > Typography >
 * Monospace). theme.css defuses that by aiming --font-mono at the sans stack, but
 * the element that can't misfire is the one that isn't a <pre>.
 */
export function PlanCard({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null
  return (
    <div className="rounded-lg bg-surface-soft p-5">
      <div className="text-caption-upper font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 whitespace-pre-wrap font-sans text-body-sm text-body-text">{text}</div>
    </div>
  )
}
