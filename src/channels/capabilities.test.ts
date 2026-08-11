import { describe, it, expect } from 'vitest'
import { getCapabilityWarning, isMessageTypeSupported } from './capabilities'
import { whatsappCapabilities } from './whatsapp/capabilities'
import { rcsCapabilities } from './rcs/capabilities'
import type { RenderableMessage } from '../schema/messages'

describe('RCS has no native list picker (Google spec: text / file / rich card only)', () => {
  it('does not mark "list" as a natively supported RCS message type', () => {
    expect(isMessageTypeSupported(rcsCapabilities, 'list')).toBe(false)
  })

  it('still declares a fallback note for "list" so the UI can explain the fallback', () => {
    expect(rcsCapabilities.fallbackNotes.list).toBeTruthy()
  })
})

describe('getCapabilityWarning', () => {
  it('flags a WhatsApp suggested_replies message over the 3-button limit', () => {
    const message: RenderableMessage = {
      type: 'suggested_replies',
      sender: 'business',
      options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
    }
    expect(getCapabilityWarning(whatsappCapabilities, message)).toMatch(/at most 3/)
  })

  it('allows a WhatsApp suggested_replies message within the 3-button limit', () => {
    const message: RenderableMessage = {
      type: 'suggested_replies',
      sender: 'business',
      options: [{ label: 'A' }, { label: 'B' }],
    }
    expect(getCapabilityWarning(whatsappCapabilities, message)).toBeNull()
  })

  it('flags a button label over WhatsApp\'s 20-character cap', () => {
    const message: RenderableMessage = {
      type: 'suggested_replies',
      sender: 'business',
      options: [{ label: 'This label is way too long for a WhatsApp button' }],
    }
    expect(getCapabilityWarning(whatsappCapabilities, message)).toMatch(/20/)
  })

  it('flags an RCS carousel with fewer than 2 cards', () => {
    const message: RenderableMessage = {
      type: 'carousel',
      sender: 'business',
      cards: [{ id: 'a', title: 'Only card' }],
    }
    expect(getCapabilityWarning(rcsCapabilities, message)).toMatch(/at least 2/)
  })

  it('flags an RCS carousel over the 10-card limit', () => {
    const message: RenderableMessage = {
      type: 'carousel',
      sender: 'business',
      cards: Array.from({ length: 11 }, (_, i) => ({ id: `c${i}`, title: `Card ${i}` })),
    }
    expect(getCapabilityWarning(rcsCapabilities, message)).toMatch(/at most 10/)
  })

  it('allows an RCS carousel with 2-10 cards', () => {
    const message: RenderableMessage = {
      type: 'carousel',
      sender: 'business',
      cards: [
        { id: 'a', title: 'Card A' },
        { id: 'b', title: 'Card B' },
      ],
    }
    expect(getCapabilityWarning(rcsCapabilities, message)).toBeNull()
  })

  it('flags a WhatsApp list with more than 10 rows total across sections', () => {
    const message: RenderableMessage = {
      type: 'list',
      sender: 'business',
      title: 'Menu',
      buttonLabel: 'View',
      sections: [
        { rows: Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` })) },
        { rows: Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, title: `Row ${i}` })) },
      ],
    }
    expect(getCapabilityWarning(whatsappCapabilities, message)).toMatch(/at most 10/)
  })

  it('flags a rich card title over RCS\'s 200-character cap', () => {
    const message: RenderableMessage = {
      type: 'rich_card',
      sender: 'business',
      title: 'x'.repeat(201),
    }
    expect(getCapabilityWarning(rcsCapabilities, message)).toMatch(/200/)
  })

  it('returns null for message types with no declared structural limits', () => {
    const message: RenderableMessage = { type: 'text', sender: 'business', text: 'Hi' }
    expect(getCapabilityWarning(whatsappCapabilities, message)).toBeNull()
  })
})
