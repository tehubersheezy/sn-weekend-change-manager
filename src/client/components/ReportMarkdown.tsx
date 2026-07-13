import type { ComponentPropsWithoutRef, JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../lib/utils'

/**
 * The weekend reports, rendered.
 *
 * This was a hand-rolled parser until tables arrived, and the reason it stopped
 * being one is worth keeping: the source here is a LANGUAGE MODEL, not a fixed
 * corpus. The grammar is constrained by a prompt, and a prompt is advisory — the
 * model will eventually emit a nested list, an escaped pipe, a ragged row, or a
 * code fence nobody asked for. A hand-rolled parser degrades silently and badly on
 * syntax it did not anticipate (its paragraph branch JOINS consecutive lines, so a
 * pipe table did not render badly — it rendered as one run-on line of pipes). remark
 * degrades gracefully. That is the whole trade, and it is why the dependency is here.
 *
 * NO MONOSPACE — AND THAT IS NOW THIS FILE'S JOB TO ENFORCE. A stock Markdown
 * renderer reaches for a mono face on `code` and fenced blocks by default. This
 * system has no mono face at all (DESIGN.md; Abey's standing preference), and a
 * report full of change numbers is exactly where a model reaches for backticks. So
 * `code` and `pre` below are overridden to the sans stack ON PURPOSE. Deleting those
 * two overrides does not cause an error — it silently ships monospace.
 *
 * Raw HTML is NOT enabled (no `rehype-raw`). LLM output rendering inside a
 * ServiceNow page has no business carrying markup, and leaving the path closed is
 * cheaper than sanitizing an open one.
 *
 * Alignment in tables is the MODEL's to declare, via the GFM delimiter row (`--:`),
 * and remark hands it through as a `style` prop that the cells below simply pass on.
 * The prompts ask for `--:` on count columns; combined with `tabular-nums`, that is
 * how digits line up without the mono face this system refuses to have.
 */

type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>

export function ReportMarkdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4 text-body-sm text-body-text', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // The serif is the display voice and belongs to headlines only. A report
          // section head is a headline; a list item is not.
          h1: ({ className: c, ...p }: Props<'h1'>) => (
            <h3 className={cn('font-display text-display-xs text-ink', c)} {...p} />
          ),
          h2: ({ className: c, ...p }: Props<'h2'>) => (
            <h3 className={cn('font-display text-display-xs text-ink', c)} {...p} />
          ),
          h3: ({ className: c, ...p }: Props<'h3'>) => (
            <h4 className={cn('text-body-md font-medium text-ink', c)} {...p} />
          ),
          h4: ({ className: c, ...p }: Props<'h4'>) => (
            <h4 className={cn('text-body-md font-medium text-ink', c)} {...p} />
          ),

          p: ({ className: c, ...p }: Props<'p'>) => (
            <p className={cn('text-body-sm leading-relaxed text-body-text', c)} {...p} />
          ),
          strong: ({ className: c, ...p }: Props<'strong'>) => (
            <strong className={cn('font-medium text-ink', c)} {...p} />
          ),
          em: ({ className: c, ...p }: Props<'em'>) => (
            <em className={cn('italic', c)} {...p} />
          ),

          ul: ({ className: c, ...p }: Props<'ul'>) => (
            <ul className={cn('flex flex-col gap-2 pl-5 list-disc', c)} {...p} />
          ),
          ol: ({ className: c, ...p }: Props<'ol'>) => (
            <ol className={cn('flex flex-col gap-2 pl-5 list-decimal', c)} {...p} />
          ),
          li: ({ className: c, ...p }: Props<'li'>) => (
            <li className={cn('pl-1 marker:text-muted-foreground', c)} {...p} />
          ),

          // A table can outgrow the detail pane, which is half the viewport. Scroll
          // it rather than letting it push the report's own column wider.
          table: ({ className: c, ...p }: Props<'table'>) => (
            <div className="overflow-x-auto">
              <table
                className={cn('w-full border-collapse text-left text-body-sm', c)}
                {...p}
              />
            </div>
          ),
          thead: ({ className: c, ...p }: Props<'thead'>) => (
            <thead className={cn('border-b border-border', c)} {...p} />
          ),
          th: ({ className: c, ...p }: Props<'th'>) => (
            <th
              className={cn(
                'px-3 py-2 text-body-sm font-medium text-muted-foreground tabular-nums',
                c,
              )}
              {...p}
            />
          ),
          // Hairline rules between rows, no zebra fill and no shadow — DESIGN.md.
          tr: ({ className: c, ...p }: Props<'tr'>) => (
            <tr className={cn('border-b border-hairline-soft last:border-0', c)} {...p} />
          ),
          td: ({ className: c, ...p }: Props<'td'>) => (
            <td className={cn('px-3 py-2 align-top text-body-text tabular-nums', c)} {...p} />
          ),

          a: ({ className: c, ...p }: Props<'a'>) => (
            <a className={cn('text-ink underline underline-offset-2', c)} {...p} />
          ),
          blockquote: ({ className: c, ...p }: Props<'blockquote'>) => (
            <blockquote
              className={cn('border-l-2 border-border pl-3 text-muted-foreground', c)}
              {...p}
            />
          ),
          hr: ({ className: c, ...p }: Props<'hr'>) => (
            <hr className={cn('border-0 border-t border-border', c)} {...p} />
          ),

          // See the header: these two exist to KEEP THE MONO FACE OUT. They are not
          // styling niceties, they are the enforcement of a hard system rule.
          code: ({ className: c, ...p }: Props<'code'>) => (
            <span className={cn('text-ink', c)} {...p} />
          ),
          // A <pre> is swapped for a <div> rather than restyled, because the mono
          // face on <pre> is a browser UA default, not a class we could override.
          // Only children cross over: <pre>'s own handler types are element-specific.
          pre: ({ className: c, children }: Props<'pre'>) => (
            <div className={cn('whitespace-pre-wrap text-body-text', c)}>{children}</div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
