import { describe, it, expect } from 'vitest'
import type { Trigger } from '../schema/flow'
import { matchTrigger, matchesScenarioTrigger, normalizeScenarioTrigger } from './triggerMatcher'

describe('matchTrigger', () => {
  it('matches a keyword case-insensitively by default', () => {
    const triggers: Trigger[] = [{ keywords: ['help'], next: 'help_node' }]
    expect(matchTrigger(triggers, 'I need HELP please')?.next).toBe('help_node')
  })

  it('matches as a whole word, not a substring of another word', () => {
    const triggers: Trigger[] = [{ keywords: ['cat'], next: 'cats' }]
    expect(matchTrigger(triggers, 'I love this category')).toBeNull()
    expect(matchTrigger(triggers, 'I have a cat')?.next).toBe('cats')
  })

  it('matches any of several keywords on one trigger', () => {
    const triggers: Trigger[] = [{ keywords: ['cancel', 'stop'], next: 'cancelled' }]
    expect(matchTrigger(triggers, 'please stop')?.next).toBe('cancelled')
    expect(matchTrigger(triggers, "I'd like to cancel")?.next).toBe('cancelled')
  })

  it('returns null when nothing matches', () => {
    const triggers: Trigger[] = [{ keywords: ['help'], next: 'help_node' }]
    expect(matchTrigger(triggers, 'hello there')).toBeNull()
  })

  it('returns null for empty/whitespace text', () => {
    const triggers: Trigger[] = [{ keywords: ['help'], next: 'help_node' }]
    expect(matchTrigger(triggers, '   ')).toBeNull()
    expect(matchTrigger(triggers, '')).toBeNull()
  })

  it('respects caseSensitive: true', () => {
    const triggers: Trigger[] = [{ keywords: ['HELP'], next: 'help_node', caseSensitive: true }]
    expect(matchTrigger(triggers, 'help me')).toBeNull()
    expect(matchTrigger(triggers, 'HELP me')?.next).toBe('help_node')
  })

  it('returns the first matching trigger in authored order', () => {
    const triggers: Trigger[] = [
      { keywords: ['order'], next: 'first' },
      { keywords: ['order'], next: 'second' },
    ]
    expect(matchTrigger(triggers, 'check my order')?.next).toBe('first')
  })

  it('does not throw on keywords containing regex special characters', () => {
    const triggers: Trigger[] = [{ keywords: ['a+b?'], next: 'special' }]
    expect(() => matchTrigger(triggers, 'what is a+b? today')).not.toThrow()
  })

  it('handles an empty triggers list', () => {
    expect(matchTrigger([], 'anything')).toBeNull()
  })
})

describe('scenario entry triggers', () => {
  it('normalizes NFC, surrounding whitespace, and case while requiring equality', () => {
    expect(normalizeScenarioTrigger('  Café  ')).toBe('café')
    expect(matchesScenarioTrigger('Café', '  CAFÉ  ')).toBe(true)
    expect(matchesScenarioTrigger('Café', 'Café please')).toBe(false)
    expect(matchesScenarioTrigger('Café', 'CafE')).toBe(false)
  })

  it('keeps internal whitespace and punctuation significant', () => {
    expect(matchesScenarioTrigger('order now', 'order  now')).toBe(false)
    expect(matchesScenarioTrigger('order-now', 'order now')).toBe(false)
  })

  it('rejects empty entry triggers', () => {
    expect(matchesScenarioTrigger('   ', 'anything')).toBe(false)
  })
})
