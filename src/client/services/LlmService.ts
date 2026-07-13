import Anthropic from '@anthropic-ai/sdk'
import type { Prompt } from '../prompts'

/**
 * Calls the configured LLM endpoint with a weekend prompt and streams the report back.
 *
 * WHY THE BROWSER TALKS TO IT DIRECTLY. Every other read in this console goes
 * through the instance — the Table API, the scoped activity route, the Jira route
 * — because ServiceNow owns the data and the ACLs. This one does not: the payload
 * is already assembled in the browser from records the user has *already been
 * shown*, so routing it back through the instance would buy no authorization we
 * don't already have, and would cost a scripted REST route that can only stream by
 * not streaming. The endpoint is CORS-enabled (Abey's, 2026-07-12), so the browser
 * calls it. `dangerouslyAllowBrowser` is the SDK's acknowledgement of exactly that
 * trade: the token is reachable from client code, which is true of anything in
 * `wcm.llmConfig` already.
 *
 * THREE THINGS HERE ARE NOT NEGOTIABLE, and each is a silent failure if changed:
 *
 *  - STREAMING. A weekend report needs a large max_tokens, and the SDK will hit an
 *    HTTP timeout on a non-streamed request above ~16K. It would not fail fast; it
 *    would hang and then die.
 *  - `thinking: {type: 'adaptive'}`, NOT `budget_tokens`. The fixed-thinking-budget
 *    parameter is REMOVED on this model family and returns a 400 — it is not
 *    deprecated-but-working. Depth is controlled by `output_config.effort` now.
 *  - NO `temperature` / `top_p` / `top_k`. Also removed, also a 400. There is
 *    nothing to tune here; steer with the prompt.
 */

/** The reasoning this console needs — collision-finding across ~110 changes is not a summarization task. */
const MODEL = 'claude-opus-4-8'

/**
 * Generous because the Review report over a full window is genuinely long, and a
 * truncated post-implementation review is worse than none. Safe only because we
 * stream (see above).
 */
const MAX_TOKENS = 16000

export type LlmDelta =
  | { kind: 'thinking'; text: string }
  | { kind: 'text'; text: string }

export interface LlmConfig {
  endpoint: string
  token: string
}

/**
 * The Settings dialog asks for an "LLM endpoint", and people will paste whatever
 * their gateway hands them — with or without the `/v1/messages` path the SDK
 * appends itself. Normalize rather than making the user guess: a doubled
 * `/v1/messages/v1/messages` is a 404 with no clue as to why.
 */
export function toBaseUrl(endpoint: string): string {
  return endpoint
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/v1\/messages$/, '')
    .replace(/\/v1$/, '')
}

export class LlmService {
  constructor(private readonly config: LlmConfig) {}

  /** True when the console has somewhere to send this. The UI gates the action on it. */
  get configured(): boolean {
    return Boolean(this.config.endpoint.trim() && this.config.token.trim())
  }

  /**
   * Stream a report. `onDelta` fires for both reasoning and answer text; the
   * resolved value is the complete report.
   *
   * Thinking is surfaced (`display: 'summarized'`) on purpose. The default is
   * `'omitted'`, which streams thinking blocks with EMPTY text — and since this
   * model thinks before it writes, an omitted display reads to the user as thirty
   * seconds of nothing at all. What it's reasoning about is the most honest thing
   * we can put on screen while they wait.
   */
  async streamReport(
    prompt: Prompt,
    onDelta: (delta: LlmDelta) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const client = new Anthropic({
      apiKey: this.config.token,
      baseURL: toBaseUrl(this.config.endpoint),
      // The console IS the browser. See the note above — this is a deliberate
      // trade, not an oversight the SDK is warning us about.
      dangerouslyAllowBrowser: true,
    })

    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: prompt.system,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: 'high' },
        messages: [{ role: 'user', content: prompt.user }],
      },
      { signal },
    )

    for await (const event of stream) {
      if (event.type !== 'content_block_delta') continue
      if (event.delta.type === 'thinking_delta') {
        onDelta({ kind: 'thinking', text: event.delta.thinking })
      } else if (event.delta.type === 'text_delta') {
        onDelta({ kind: 'text', text: event.delta.text })
      }
    }

    const message = await stream.finalMessage()

    // A refusal is a successful HTTP 200 with empty or partial content — code that
    // reads content[0] without checking stop_reason gets a confusing blank report
    // rather than an error.
    if (message.stop_reason === 'refusal') {
      throw new Error('The model declined to generate this report.')
    }

    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
  }
}
