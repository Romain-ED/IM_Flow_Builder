import { describe, it, expect } from 'vitest'
import type { Message } from '../../schema/messages'
import { normalizeForRcs } from './normalize'

describe('normalizeForRcs', () => {
  it('attaches suggested_replies to a preceding rich_card — valid on RCS even without body text', () => {
    const messages: Message[] = [
      { type: 'rich_card', sender: 'business', title: 'Upgrade', actions: [] },
      { type: 'suggested_replies', sender: 'business', options: [{ label: 'Yes' }, { label: 'No' }] },
    ]
    const { normalized, errors } = normalizeForRcs(messages)
    expect(errors).toEqual([])
    expect(normalized).toEqual([{ kind: 'rich_card', suggestionCount: 2 }])
  })

  it('attaches suggested_actions to a preceding text message', () => {
    const messages: Message[] = [
      { type: 'text', sender: 'business', text: 'Need help?' },
      {
        type: 'suggested_actions',
        sender: 'business',
        actions: [{ type: 'open_url', label: 'Visit site', url: 'https://x' }],
      },
    ]
    const { normalized, errors } = normalizeForRcs(messages)
    expect(errors).toEqual([])
    expect(normalized).toEqual([{ kind: 'text', suggestionCount: 1 }])
  })

  it('hard-errors on a standalone suggested_replies message with no preceding content message', () => {
    const messages: Message[] = [{ type: 'suggested_replies', sender: 'business', options: [{ label: 'Yes' }] }]
    const { normalized, errors } = normalizeForRcs(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('no preceding content')
    expect(normalized).toEqual([])
  })

  it('hard-errors when attached suggestions exceed the RCS per-message limit', () => {
    const options = Array.from({ length: 12 }, (_, i) => ({ label: `Option ${i}` }))
    const messages: Message[] = [
      { type: 'text', sender: 'business', text: 'Pick one' },
      { type: 'suggested_replies', sender: 'business', options },
    ]
    const { normalized, errors } = normalizeForRcs(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('12')
    expect(normalized).toEqual([])
  })

  it('hard-errors on an RCS carousel with fewer than 2 cards', () => {
    const messages: Message[] = [
      { type: 'carousel', sender: 'business', cards: [{ id: 'c1', title: 'Only card' }] },
    ]
    const { errors } = normalizeForRcs(messages)
    expect(errors.some((e) => e.includes('at least 2 cards'))).toBe(true)
  })

  it('hard-errors on an RCS carousel with more than 10 cards', () => {
    const cards = Array.from({ length: 11 }, (_, i) => ({ id: `c${i}`, title: `Card ${i}` }))
    const messages: Message[] = [{ type: 'carousel', sender: 'business', cards }]
    const { errors } = normalizeForRcs(messages)
    expect(errors.some((e) => e.includes('at most 10'))).toBe(true)
  })

  it('hard-errors on a carousel card with more buttons than RCS allows', () => {
    const messages: Message[] = [
      {
        type: 'carousel',
        sender: 'business',
        cards: [
          {
            id: 'c1',
            title: 'Card 1',
            actions: [
              { type: 'reply', label: 'A' },
              { type: 'reply', label: 'B' },
              { type: 'reply', label: 'C' },
              { type: 'reply', label: 'D' },
              { type: 'reply', label: 'E' },
            ],
          },
          { id: 'c2', title: 'Card 2' },
        ],
      },
    ]
    const { errors } = normalizeForRcs(messages)
    expect(errors.some((e) => e.includes('5 buttons'))).toBe(true)
  })

  it('hard-errors on a rich_card with more buttons than RCS allows', () => {
    const messages: Message[] = [
      {
        type: 'rich_card',
        sender: 'business',
        title: 'Card',
        actions: [
          { type: 'reply', label: 'A' },
          { type: 'reply', label: 'B' },
          { type: 'reply', label: 'C' },
          { type: 'reply', label: 'D' },
          { type: 'reply', label: 'E' },
        ],
      },
    ]
    const { normalized, errors } = normalizeForRcs(messages)
    expect(errors.some((e) => e.includes('5 buttons'))).toBe(true)
    expect(normalized).toEqual([])
  })

  it('does not validate a message type RCS has no native support for at all (e.g. list stays a soft fallback)', () => {
    const messages: Message[] = [
      { type: 'list', sender: 'business', title: 'Menu', buttonLabel: 'Choose', sections: [{ rows: [{ id: 'r1', title: 'Row' }] }] },
    ]
    const { normalized, errors } = normalizeForRcs(messages)
    expect(errors).toEqual([])
    expect(normalized).toEqual([])
  })
})
