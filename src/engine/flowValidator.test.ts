import { describe, it, expect } from 'vitest'
import { validateFlow } from './flowValidator'

function baseFlow(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    metadata: { id: 'test', name: 'Test flow' },
    brand: { name: 'Test Brand' },
    start: 'welcome',
    nodes: [
      {
        id: 'welcome',
        messages: [{ type: 'text', text: 'Hi' }],
        actions: [{ label: 'Go', next: 'end' }],
      },
      { id: 'end', messages: [{ type: 'text', text: 'Bye' }], end: true },
    ],
    ...overrides,
  }
}

describe('validateFlow', () => {
  it('accepts a well-formed flow', () => {
    const result = validateFlow(baseFlow())
    expect(result.success).toBe(true)
  })

  it('rejects malformed input without throwing', () => {
    expect(() => validateFlow({ not: 'a flow' })).not.toThrow()
    const result = validateFlow({ not: 'a flow' })
    expect(result.success).toBe(false)
  })

  it('rejects non-object input without throwing', () => {
    const result = validateFlow('just a string')
    expect(result.success).toBe(false)
  })

  it('flags duplicate node ids', () => {
    const flow = baseFlow({
      nodes: [
        { id: 'welcome', messages: [{ type: 'text', text: 'Hi' }], end: true },
        { id: 'welcome', messages: [{ type: 'text', text: 'Hi again' }], end: true },
      ],
    })
    const result = validateFlow(flow)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.message.includes('Duplicate node id'))).toBe(true)
    }
  })

  it('flags a start node that does not exist', () => {
    const flow = baseFlow({ start: 'missing' })
    const result = validateFlow(flow)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.message.includes('Start node'))).toBe(true)
    }
  })

  it('flags a dangling "next" reference on a node action', () => {
    const flow = baseFlow({
      nodes: [
        {
          id: 'welcome',
          messages: [{ type: 'text', text: 'Hi' }],
          actions: [{ label: 'Go', next: 'does_not_exist' }],
        },
      ],
    })
    const result = validateFlow(flow)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.errors.some((e) => e.message.includes('does_not_exist') && e.message.includes('welcome')),
      ).toBe(true)
    }
  })

  it('flags a dangling reference inside a suggested_replies message', () => {
    const flow = baseFlow({
      nodes: [
        {
          id: 'welcome',
          messages: [{ type: 'suggested_replies', options: [{ label: 'Go', next: 'nowhere' }] }],
        },
      ],
    })
    const result = validateFlow(flow)
    expect(result.success).toBe(false)
  })

  it('flags a dangling reference in a global trigger', () => {
    const flow = baseFlow({ triggers: [{ keywords: ['help'], next: 'nowhere' }] })
    const result = validateFlow(flow)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.message.includes('Trigger') && e.message.includes('nowhere'))).toBe(true)
    }
  })

  it('accepts a flow with a valid global trigger', () => {
    const flow = baseFlow({ triggers: [{ keywords: ['help'], next: 'end' }] })
    const result = validateFlow(flow)
    expect(result.success).toBe(true)
  })

  it('flags a condition with no "then" target', () => {
    const flow = baseFlow({
      nodes: [
        { id: 'welcome', condition: { variable: 'x', operator: 'exists' } },
        { id: 'end', messages: [{ type: 'text', text: 'Bye' }], end: true },
      ],
    })
    const result = validateFlow(flow)
    expect(result.success).toBe(false)
  })

  it('warns (but does not error) on a dead-end node with no outcome', () => {
    const flow = baseFlow({
      nodes: [
        { id: 'welcome', messages: [{ type: 'text', text: 'Hi' }] },
      ],
      start: 'welcome',
    })
    const result = validateFlow(flow)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.warnings.length).toBeGreaterThan(0)
    }
  })

  it('does not warn when a node has boarding_pass content (implicit interactivity)', () => {
    const flow = baseFlow({
      nodes: [
        {
          id: 'welcome',
          messages: [
            {
              type: 'boarding_pass',
              passengerName: 'A',
              airline: 'A',
              flightNumber: 'A1',
              date: '1 Jan',
              origin: { code: 'AAA', city: 'A' },
              destination: { code: 'BBB', city: 'B' },
              departureTime: '10:00',
              bookingReference: 'REF1',
            },
          ],
        },
      ],
    })
    const result = validateFlow(flow)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.warnings.length).toBe(0)
    }
  })
})
