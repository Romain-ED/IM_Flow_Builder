import { parseFlowSource } from './flowSource'
import { validateFlowWithChannelCompliance } from '../channels/validateChannelCompliance'
import { SCENARIO_AUTHORING_GUIDE } from './scenarioAuthoringGuide'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
export const DEFAULT_AI_MODEL = 'claude-sonnet-5'

export interface GenerateScenarioSuccess {
  success: true
  source: string
}
export interface GenerateScenarioFailure {
  success: false
  error: string
}
export type GenerateScenarioResult = GenerateScenarioSuccess | GenerateScenarioFailure

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GenerateOptions {
  model?: string
  /** Injectable for tests — defaults to the global `fetch`. No test ever hits the real network. */
  fetchImpl?: typeof fetch
}

/**
 * Calls Anthropic's Messages API **directly from the browser** with a
 * user-supplied key (`anthropic-dangerous-direct-browser-access` — the
 * header Anthropic documents specifically for this kind of local
 * client-only tool). This app has no backend and isn't getting one for
 * this feature; the key is read from this browser's own storage
 * (`store/persistence.ts`) and sent only to Anthropic, never anywhere
 * else. See CLAUDE.md for the reasoning.
 *
 * Generates once against `SCENARIO_AUTHORING_GUIDE`, validates the result
 * with the app's own `validateFlowWithChannelCompliance` (the same
 * validator scenario loading uses), and — if invalid — retries **once**
 * with the validation errors fed back for a self-correction pass. Bounded
 * to one retry, not an open-ended agent loop: whatever comes back after
 * that is returned as-is (`success: true`) even if still invalid — the
 * editor's own live validation preview shows the remaining errors, so a
 * still-imperfect result is still visible and editable, not a dead end.
 */
export async function generateScenarioWithAI(
  apiKey: string,
  description: string,
  options: GenerateOptions = {},
): Promise<GenerateScenarioResult> {
  if (!apiKey.trim()) return { success: false, error: 'Enter an Anthropic API key first.' }
  if (!description.trim()) return { success: false, error: 'Describe the scenario you want first.' }

  const model = options.model?.trim() || DEFAULT_AI_MODEL
  const fetchImpl = options.fetchImpl ?? fetch

  const first = await callAnthropic(apiKey, [{ role: 'user', content: description }], model, fetchImpl)
  if (!first.success) return first

  const firstSource = stripCodeFences(first.text)
  const firstCheck = checkValidity(firstSource)
  if (firstCheck.valid) return { success: true, source: firstSource }

  const retry = await callAnthropic(
    apiKey,
    [
      { role: 'user', content: description },
      { role: 'assistant', content: first.text },
      {
        role: 'user',
        content: `That failed validation:\n${firstCheck.errors.join('\n')}\n\nOutput ONLY the corrected YAML, no commentary, no code fences.`,
      },
    ],
    model,
    fetchImpl,
  )
  // A transient failure on the self-correction pass shouldn't lose the
  // first (still-invalid, but real) attempt — hand that back instead.
  if (!retry.success) return { success: true, source: firstSource }

  return { success: true, source: stripCodeFences(retry.text) }
}

function checkValidity(source: string): { valid: boolean; errors: string[] } {
  const parsed = parseFlowSource(source)
  if (!parsed.success) return { valid: false, errors: [parsed.message] }
  const result = validateFlowWithChannelCompliance(parsed.data)
  if (result.success) return { valid: true, errors: [] }
  return { valid: false, errors: result.errors.map((e) => e.message) }
}

async function callAnthropic(
  apiKey: string,
  messages: AnthropicMessage[],
  model: string,
  fetchImpl: typeof fetch,
): Promise<{ success: true; text: string } | GenerateScenarioFailure> {
  let response: Response
  try {
    response = await fetchImpl(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: SCENARIO_AUTHORING_GUIDE,
        messages,
      }),
    })
  } catch {
    return {
      success: false,
      error: 'Network error reaching Anthropic\'s API — check your connection, or use "Copy prompt instead".',
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      return { success: false, error: 'Anthropic rejected this API key (401) — double-check it at console.anthropic.com.' }
    }
    if (response.status === 429) {
      return { success: false, error: 'Rate limited by Anthropic (429) — wait a moment and try again.' }
    }
    const bodyText = await response.text().catch(() => '')
    return { success: false, error: `Anthropic API error (${response.status}): ${bodyText.slice(0, 200) || response.statusText}` }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { success: false, error: "Could not parse Anthropic's response." }
  }

  const text = extractText(body)
  if (!text) return { success: false, error: 'Anthropic returned an empty response.' }
  return { success: true, text }
}

function extractText(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const content = (body as { content?: unknown }).content
  if (!Array.isArray(content)) return null
  const textParts = content
    .filter(
      (block): block is { type: 'text'; text: string } =>
        typeof block === 'object' && block !== null && (block as { type?: unknown }).type === 'text' &&
        typeof (block as { text?: unknown }).text === 'string',
    )
    .map((block) => block.text)
  return textParts.length > 0 ? textParts.join('\n') : null
}

/** Strips a ```yaml / ```json / ``` code fence if the model wrapped its output in one despite instructions not to. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:ya?ml|json)?\n([\s\S]*?)\n?```$/)
  return fenceMatch ? fenceMatch[1] : trimmed
}
