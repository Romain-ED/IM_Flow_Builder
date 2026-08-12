import { describe, it, expect } from 'vitest'
import { validateFlowWithChannelCompliance } from './validateChannelCompliance'

function baseFlow(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    metadata: { id: 'test', name: 'Test flow' },
    brand: { name: 'Test Brand' },
    start: 'welcome',
    nodes: [{ id: 'welcome', messages: [{ type: 'text', text: 'Hi' }], end: true }],
    ...overrides,
  }
}

describe('validateFlowWithChannelCompliance', () => {
  it('accepts a well-formed, channel-compliant flow', () => {
    const result = validateFlowWithChannelCompliance(baseFlow())
    expect(result.success).toBe(true)
  })

  it('still rejects a structurally invalid flow (delegates to validateFlow first)', () => {
    const result = validateFlowWithChannelCompliance({ not: 'a flow' })
    expect(result.success).toBe(false)
  })

  it('hard-fails a structurally valid flow that violates a real WhatsApp limit, with a channel-prefixed message', () => {
    const flow = baseFlow({
      nodes: [
        {
          id: 'welcome',
          messages: [
            { type: 'text', text: 'Pick one' },
            {
              type: 'suggested_replies',
              options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
            },
          ],
          end: true,
        },
      ],
    })
    const result = validateFlowWithChannelCompliance(flow)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.message.startsWith('[WhatsApp]') && e.nodeId === 'welcome')).toBe(true)
    }
  })

  it('hard-fails a flow with a standalone suggested_actions message with no owning content', () => {
    const flow = baseFlow({
      start: 'help',
      nodes: [
        {
          id: 'help',
          messages: [
            { type: 'suggested_actions', actions: [{ type: 'call', label: 'Call us', phoneNumber: '123' }] },
          ],
          end: true,
        },
      ],
    })
    const result = validateFlowWithChannelCompliance(flow)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.message.includes('[WhatsApp]'))).toBe(true)
      expect(result.errors.some((e) => e.message.includes('[RCS]'))).toBe(true)
    }
  })
})
