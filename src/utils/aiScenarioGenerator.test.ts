import { describe, it, expect, vi } from 'vitest'
import { generateScenarioWithAI, DEFAULT_AI_MODEL } from './aiScenarioGenerator'

const VALID_YAML = `version: "1.0"
metadata:
  id: test-scenario
  name: "Test"
brand:
  name: "Test Brand"
start: welcome
nodes:
  - id: welcome
    messages:
      - type: text
        text: "Hi!"
    end: true`

const INVALID_YAML = `version: "1.0"
metadata:
  id: test-scenario
  name: "Test"
brand:
  name: "Test Brand"
start: welcome
nodes:
  - id: welcome
    messages:
      - type: suggested_replies
        options:
          - label: "Yes"
    end: true`

function anthropicResponse(text: string): Response {
  return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('generateScenarioWithAI', () => {
  it('rejects an empty API key without calling fetch', async () => {
    const fetchImpl = vi.fn()
    const result = await generateScenarioWithAI('', 'a pizza order flow', { fetchImpl })
    expect(result.success).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects an empty description without calling fetch', async () => {
    const fetchImpl = vi.fn()
    const result = await generateScenarioWithAI('sk-ant-test', '', { fetchImpl })
    expect(result.success).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns the first response as-is when it already validates, making exactly one call', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(anthropicResponse(VALID_YAML))
    const result = await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    expect(result).toEqual({ success: true, source: VALID_YAML })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('sends the correct request shape (browser-access header, key, model, system prompt)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(anthropicResponse(VALID_YAML))
    await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl, model: 'claude-custom' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.headers['x-api-key']).toBe('sk-ant-test')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('claude-custom')
    expect(body.system).toContain('Business Messaging Flow Simulator')
    expect(body.messages).toEqual([{ role: 'user', content: 'a pizza order flow' }])
  })

  it('strips a code fence the model wrapped its output in', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(anthropicResponse('```yaml\n' + VALID_YAML + '```'))
    const result = await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    expect(result).toEqual({ success: true, source: VALID_YAML })
  })

  it('retries once with validation errors when the first response is invalid, and returns the retry result', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(anthropicResponse(INVALID_YAML))
      .mockResolvedValueOnce(anthropicResponse(VALID_YAML))
    const result = await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    expect(result).toEqual({ success: true, source: VALID_YAML })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const retryBody = JSON.parse(fetchImpl.mock.calls[1][1].body)
    expect(retryBody.messages).toHaveLength(3)
    expect(retryBody.messages[2].content).toContain('failed validation')
  })

  it('does not retry a third time — returns the second attempt even if still invalid', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(anthropicResponse(INVALID_YAML))
      .mockResolvedValueOnce(anthropicResponse(INVALID_YAML))
    const result = await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    expect(result).toEqual({ success: true, source: INVALID_YAML })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('falls back to the first (invalid) attempt if the retry call itself fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(anthropicResponse(INVALID_YAML))
      .mockRejectedValueOnce(new Error('network down'))
    const result = await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    expect(result).toEqual({ success: true, source: INVALID_YAML })
  })

  it('surfaces a clear error on a network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('Network error')
  })

  it('surfaces a clear error on an invalid API key (401)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    const result = await generateScenarioWithAI('sk-ant-bad', 'a pizza order flow', { fetchImpl })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('401')
  })

  it('surfaces a clear error on a rate limit (429)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }))
    const result = await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('Rate limited')
  })

  it('uses the default model when none is specified', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(anthropicResponse(VALID_YAML))
    await generateScenarioWithAI('sk-ant-test', 'a pizza order flow', { fetchImpl })
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(body.model).toBe(DEFAULT_AI_MODEL)
  })
})
