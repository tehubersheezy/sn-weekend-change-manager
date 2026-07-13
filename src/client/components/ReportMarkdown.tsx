import { cn } from '../lib/utils'

/**
 * The narrow slice of Markdown the weekend reports actually emit.
 *
 * Not a general Markdown engine, and deliberately not a dependency. The prompts
 * constrain the model to prose, headings, bullets and bold ("Write in prose and
 * lists. No tables."), so the grammar here is the grammar the reports use —
 * anything wider would be untested surface area shipped into a ServiceNow bundle.
 *
 * NO CODE BLOCKS, NO INLINE CODE, NO MONOSPACE. That is not an omission: this
 * system has no mono face (DESIGN.md, and Abey's standing preference), and a
 * report full of change numbers is exactly where a naive renderer would reach for
 * one. Record numbers are prose here, set in the sans face like everything else.
 */

/** Bold spans, and nothing else. The reports use `**` for emphasis and no other inline mark. */
function inline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = /^\*\*[^*]+\*\*$/.test(part)
    return bold ? (
      <strong key={`${keyPrefix}-${i}`} className="font-medium text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  })
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'para'; text: string }

/**
 * Group lines into blocks. Consecutive list lines coalesce into one list — the
 * alternative (a <ul> per bullet) is what makes hand-rolled renderers produce
 * that telltale broken-spacing look.
 */
function parse(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  let para: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'para', text: para.join(' ') })
    para = []
  }
  const flushList = () => {
    if (list) blocks.push({ kind: 'list', ...list })
    list = null
  }
  const flushAll = () => {
    flushPara()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trim()

    if (!line) {
      flushAll()
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flushAll()
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] })
      continue
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      flushPara()
      const ordered = Boolean(numbered)
      // A switch between bullets and numbers starts a new list rather than
      // silently absorbing one into the other.
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)![1])
      continue
    }

    flushList()
    para.push(line)
  }
  flushAll()

  return blocks
}

export function ReportMarkdown({ source, className }: { source: string; className?: string }) {
  const blocks = parse(source)

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          // The serif is the display voice and belongs to headlines only. A report
          // section head is a headline; a list item is not.
          return (
            <h3
              key={i}
              className={cn(
                'font-display text-ink',
                block.level <= 2 ? 'text-display-xs' : 'text-body-md font-medium',
                i > 0 && 'mt-2',
              )}
            >
              {block.text}
            </h3>
          )
        }

        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List
              key={i}
              className={cn(
                'flex flex-col gap-2 pl-5 text-body-sm text-body-text',
                block.ordered ? 'list-decimal' : 'list-disc',
              )}
            >
              {block.items.map((item, j) => (
                <li key={j} className="pl-1 marker:text-muted-foreground">
                  {inline(item, `${i}-${j}`)}
                </li>
              ))}
            </List>
          )
        }

        return (
          <p key={i} className="text-body-sm leading-relaxed text-body-text">
            {inline(block.text, String(i))}
          </p>
        )
      })}
    </div>
  )
}
