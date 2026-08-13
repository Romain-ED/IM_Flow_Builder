import { describe, it, expect } from 'vitest'
import type { Message } from '../../schema/messages'
import { normalizeForWhatsApp } from './normalize'

describe('normalizeForWhatsApp', () => {
  it('merges a business text message with a following suggested_replies within the button limit', () => {
    const messages: Message[] = [
      { type: 'text', sender: 'business', text: 'Hi' },
      { type: 'suggested_replies', sender: 'business', options: [{ label: 'Yes' }, { label: 'No' }] },
    ]
    const { normalized, errors } = normalizeForWhatsApp(messages)
    expect(errors).toEqual([])
    expect(normalized).toEqual([{ kind: 'interactive_buttons', body: 'Hi', buttonCount: 2 }])
  })

  it('merges a business text message with a following suggested_actions within the button limit', () => {
    const messages: Message[] = [
      { type: 'text', sender: 'business', text: 'Need help?' },
      {
        type: 'suggested_actions',
        sender: 'business',
        actions: [{ type: 'open_url', label: 'Visit site', url: 'https://x' }],
      },
    ]
    const { normalized, errors } = normalizeForWhatsApp(messages)
    expect(errors).toEqual([])
    expect(normalized).toEqual([{ kind: 'interactive_buttons', body: 'Need help?', buttonCount: 1 }])
  })

  it('hard-errors on a suggested_replies message attached to text with more than 3 buttons', () => {
    const messages: Message[] = [
      { type: 'text', sender: 'business', text: 'Pick one' },
      {
        type: 'suggested_replies',
        sender: 'business',
        options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
      },
    ]
    const { normalized, errors } = normalizeForWhatsApp(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('4 buttons')
    expect(normalized).toEqual([])
  })

  it('hard-errors on a standalone suggested_replies message with no preceding text', () => {
    const messages: Message[] = [
      { type: 'suggested_replies', sender: 'business', options: [{ label: 'Yes' }] },
    ]
    const { normalized, errors } = normalizeForWhatsApp(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('no body text')
    expect(normalized).toEqual([])
  })

  it('hard-errors on a standalone suggested_actions message with no preceding text', () => {
    const messages: Message[] = [
      { type: 'suggested_actions', sender: 'business', actions: [{ type: 'call', label: 'Call us', phoneNumber: '123' }] },
    ]
    const { errors } = normalizeForWhatsApp(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('no body text')
  })

  it('does not attach a suggested_replies message to a preceding rich_card (WhatsApp needs body text specifically)', () => {
    const messages: Message[] = [
      { type: 'rich_card', sender: 'business', title: 'Upgrade', actions: [] },
      { type: 'suggested_replies', sender: 'business', options: [{ label: 'Yes' }] },
    ]
    const { errors } = normalizeForWhatsApp(messages)
    expect(errors.some((e) => e.includes('no body text'))).toBe(true)
  })

  it('hard-errors on a rich_card that sets both header text and image', () => {
    const messages: Message[] = [
      { type: 'rich_card', sender: 'business', header: 'Limited time', image: '/promo.png', title: 'Sale', actions: [] },
    ]
    const { errors } = normalizeForWhatsApp(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('text OR media')
  })

  it('does not error on a rich_card with only header text or only an image', () => {
    const headerOnly: Message[] = [{ type: 'rich_card', sender: 'business', header: 'Limited time', title: 'Sale', actions: [] }]
    const imageOnly: Message[] = [{ type: 'rich_card', sender: 'business', image: '/promo.png', title: 'Sale', actions: [] }]
    expect(normalizeForWhatsApp(headerOnly).errors).toEqual([])
    expect(normalizeForWhatsApp(imageOnly).errors).toEqual([])
  })

  it('hard-errors on a rich_card with more buttons than WhatsApp allows', () => {
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
        ],
      },
    ]
    const { normalized, errors } = normalizeForWhatsApp(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('4 buttons')
    expect(normalized).toEqual([])
  })

  it('hard-errors on a list with more rows than WhatsApp allows', () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` }))
    const messages: Message[] = [
      {
        type: 'list',
        sender: 'business',
        title: 'Menu',
        buttonLabel: 'Choose',
        sections: [{ rows }],
      },
    ]
    const { errors } = normalizeForWhatsApp(messages)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('11 rows')
  })

  it('hard-errors on a carousel card with more buttons than WhatsApp Carousel Templates allow', () => {
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
            ],
          },
          { id: 'c2', title: 'Card 2' },
        ],
      },
    ]
    const { errors } = normalizeForWhatsApp(messages)
    expect(errors.some((e) => e.includes('3 buttons'))).toBe(true)
  })

  it('does not validate a message type WhatsApp has no official basis for at all (soft fallback stays soft)', () => {
    const messages: Message[] = [
      { type: 'otp', sender: 'business', codeLength: 6, variable: 'code' } as unknown as Message,
    ]
    const { normalized, errors } = normalizeForWhatsApp(messages)
    expect(errors).toEqual([])
    expect(normalized).toEqual([])
  })

  it('normalizes a plain text message with no trailing buttons', () => {
    const messages: Message[] = [{ type: 'text', sender: 'business', text: 'Hello' }]
    const { normalized, errors } = normalizeForWhatsApp(messages)
    expect(errors).toEqual([])
    expect(normalized).toEqual([{ kind: 'text', body: 'Hello' }])
  })
})
