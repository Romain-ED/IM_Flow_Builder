/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { BUILT_IN_SCENARIOS } from './index'
import { parseFlowSource } from '../utils/flowSource'
import { validateFlowWithChannelCompliance } from '../channels/validateChannelCompliance'
import { isMessageTypeSupported } from '../channels/capabilities'
import { whatsappCapabilities } from '../channels/whatsapp/capabilities'
import { rcsCapabilities } from '../channels/rcs/capabilities'
import { flowDefinitionSchema, type MessageType } from '../schema/flow'
import { preflightLiveRcsFlow } from '../live/rcsPreflight'
import { normalizeScenarioTrigger } from '../engine/triggerMatcher'
import { validateBuiltInRcsTriggers } from './triggerRegistry'

describe('built-in scenarios', () => {
  for (const scenario of BUILT_IN_SCENARIOS) {
    it(`${scenario.id} parses, validates, and is compliant on its authored channel`, () => {
      const parsed = parseFlowSource(scenario.source, 'yaml')
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      const result = validateFlowWithChannelCompliance(parsed.data)
      if (!result.success) {
        throw new Error(`${scenario.id} failed validation:\n${result.errors.map((e) => e.message).join('\n')}`)
      }
      expect(result.success).toBe(true)
    })
  }
})

describe('RCS capacity regressions', () => {
  it('rejects duplicate normalized RCS entry triggers across built-ins', () => {
    const triggers = BUILT_IN_SCENARIOS.flatMap((scenario) => {
      const parsed = parseFlowSource(scenario.source, 'yaml')
      expect(parsed.success).toBe(true)
      if (!parsed.success) return []
      const flow = flowDefinitionSchema.parse(parsed.data)
      return flow.metadata.channel === 'rcs' ? [flow.metadata.trigger] : []
    }).filter((trigger): trigger is string => Boolean(trigger))

    expect(new Set(triggers.map(normalizeScenarioTrigger)).size).toBe(triggers.length)
    expect(validateBuiltInRcsTriggers()).toEqual([])
    expect(triggers).toHaveLength(4)
  })

  it('authors the RCS Demo Menu with one real-logo card per selectable RCS built-in', () => {
    const menu = BUILT_IN_SCENARIOS.find((scenario) => scenario.id === 'rcs-demo-menu')
    expect(menu).toBeDefined()
    const parsed = parseFlowSource(menu!.source, 'yaml')
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    const flow = flowDefinitionSchema.parse(parsed.data)
    expect(flow.metadata.trigger).toBe('RCS MENU')
    const selectable = BUILT_IN_SCENARIOS.filter((scenario) => scenario.id !== 'rcs-demo-menu' && (() => {
      const candidate = parseFlowSource(scenario.source, 'yaml')
      return candidate.success && flowDefinitionSchema.parse(candidate.data).metadata.channel === 'rcs'
    })())
    expect(selectable.map((scenario) => scenario.id)).toEqual([
      'singapore-airlines',
      'dominos-singapore-rcs-demo',
      'vbank-multifinance-first-repayment',
    ])
    const welcome = flow.nodes.find((node) => node.id === 'welcome')!
    expect(welcome.messages).toHaveLength(1)
    const carousel = welcome.messages?.[0]
    expect(carousel?.type).toBe('carousel')
    if (carousel?.type !== 'carousel') return
    expect(carousel.cards).toHaveLength(selectable.length)
    expect(carousel.cards.map((card) => ({ id: card.id, image: card.image, startScenarioId: card.actions?.[0]?.type === 'reply' ? card.actions[0].startScenarioId : undefined }))).toEqual([
      { id: 'singapore-airlines', image: '/assets/singapore-airlines/brand-logo.png', startScenarioId: 'singapore-airlines' },
      { id: 'dominos-singapore-rcs-demo', image: '/assets/dominos-singapore-rcs-demo/imgi_17_app-icon.png', startScenarioId: 'dominos-singapore-rcs-demo' },
      { id: 'vbank-multifinance-first-repayment', image: '/assets/V%20Bank/logo.jpg', startScenarioId: 'vbank-multifinance-first-repayment' },
    ])
    expect(carousel.cards.some((card) => card.id === 'rcs-demo-menu')).toBe(false)
  })

  it("uses four Domino's welcome card actions and keeps coherent choice groups together", () => {
    const scenario = BUILT_IN_SCENARIOS.find((entry) => entry.id === 'dominos-singapore-rcs-demo')
    expect(scenario).toBeDefined()
    const parsed = parseFlowSource(scenario!.source, 'yaml')
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    const flow = flowDefinitionSchema.parse(parsed.data)
    const welcome = flow.nodes.find((node) => node.id === 'welcome')!
    const welcomeCard = welcome.messages?.find((message) => message.type === 'rich_card')
    expect(welcomeCard?.type === 'rich_card' ? welcomeCard.actions : []).toHaveLength(4)

    for (const node of flow.nodes) {
      const messages = node.messages ?? []
      for (let index = 1; index < messages.length; index++) {
        const previous = messages[index - 1].type
        const current = messages[index].type
        expect([previous, current]).not.toEqual([
          expect.stringMatching(/^suggested_(replies|actions)$/),
          expect.stringMatching(/^suggested_(replies|actions)$/),
        ])
      }
    }
  })
})
// use has a real wire-format equivalent on *at least one* of WhatsApp/RCS —
// i.e. none of them is one of the 5 types CLAUDE.md documents as having "no
// official basis on any platform" (otp, flight_card, boarding_pass,
// payment_request, calendar_event). This deliberately does NOT require both
// channels to support every type: `list` (WhatsApp-only, real native list
// picker) and `whatsapp_flow` (WhatsApp-only by definition) are genuine
// single-platform types, and correctly still show an honest fallback note
// when a built-in is cross-viewed on the other channel via the channel
// toggle — that's accurate platform-difference reporting, not a bug to chase
// away. "typing"/"delay" are excluded as pseudo-messages never stored in
// history or passed through MessageRenderer's isMessageTypeSupported check
// (see CLAUDE.md's "Official vs. invented message types" section). This
// catches regressions like the one that shipped Beerlao's OTP step with a
// live "not officially supported" warning banner on its own (WhatsApp) home
// channel.
describe('built-in scenarios use only officially-supported message types', () => {
  const exemptPseudoTypes: MessageType[] = ['typing', 'delay']

  for (const scenario of BUILT_IN_SCENARIOS) {
    it(`${scenario.id} never uses a message type unsupported on every real platform`, () => {
      const parsed = parseFlowSource(scenario.source, 'yaml')
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      const flow = flowDefinitionSchema.parse(parsed.data)

      for (const node of flow.nodes) {
        for (const message of node.messages ?? []) {
          if (exemptPseudoTypes.includes(message.type)) continue
          const supportedSomewhere =
            isMessageTypeSupported(whatsappCapabilities, message.type) ||
            isMessageTypeSupported(rcsCapabilities, message.type)
          if (!supportedSomewhere) {
            throw new Error(
              `${scenario.id}/${node.id}: message type "${message.type}" has no real WhatsApp or RCS equivalent (a simulator-only invented type). Built-in scenarios must only use officially-supported types — see CLAUDE.md.`,
            )
          }
        }
      }
    })
  }
})


describe('RCS built-ins are ready for Live RCS transport', () => {
  for (const scenario of BUILT_IN_SCENARIOS) {
    it(`${scenario.id} compiles when its authored channel is RCS`, () => {
      const parsed = parseFlowSource(scenario.source, 'yaml')
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      const flow = flowDefinitionSchema.parse(parsed.data)
      if (flow.metadata.channel !== 'rcs') return

      const result = preflightLiveRcsFlow(flow, { publicBaseUrl: 'https://demo.example' })
      if (!result.success) {
        throw new Error(`${scenario.id} failed Live RCS preflight:\n${result.errors.map((error) => error.message).join('\n')}`)
      }
      expect(result.success).toBe(true)
    })
  }
})

describe('built-in RCS profile audit', () => {
  const expected = {
    'singapore-airlines': { displayName: 'Singapore Airlines', subtitle: 'Travel support and flight services', phone: '+1 202 555 0165', website: 'singaporeair.example', email: 'care@singaporeair.example', verified: true, banner: '/assets/singapore-airlines/aircraft-a350.png', images: ['/assets/singapore-airlines/aircraft-a350.png', '/assets/singapore-airlines/seat-window.png', '/assets/singapore-airlines/seat-aisle.png'] },
    'dominos-singapore-rcs-demo': { displayName: "Domino's Pizza Singapore", subtitle: 'Pizza delivery, takeaway, and customer care', phone: '+1 202 555 0174', website: 'dominos-sg.example', email: 'care@dominos-sg.example', verified: true, banner: '/assets/dominos-singapore-rcs-demo/image-4.png', images: ['/assets/dominos-singapore-rcs-demo/imgi_3_SG_130045_en_MenuImage_17018.jpg', '/assets/dominos-singapore-rcs-demo/imgi_5_SG_460691_en_MenuImage_17096.jpg', '/assets/dominos-singapore-rcs-demo/imgi_13_SG_50R1_en_MenuImage_16018.jpg'] },
    'vbank-multifinance-first-repayment': { displayName: 'V Bank', subtitle: 'Personal banking and lending', phone: '+1 202 555 0183', website: 'vbank.example', email: 'care@vbank.example', verified: true, banner: '/assets/V%20Bank/banner%20wide.jpg', images: ['/assets/V%20Bank/2.jpg', '/assets/V%20Bank/car%20loan.jpg', '/assets/V%20Bank/home%20mortgage.jpg'] },
    'rcs-demo-menu': { displayName: 'RCS Business Messaging', subtitle: 'Explore business messaging experiences', phone: '+1 202 555 0192', website: 'rcs-messaging.example', email: 'support@rcs-messaging.example', verified: true, banner: '/assets/rcs-demo-menu/profile-banner.svg', images: [] },
    ecommerce: { displayName: 'Northwind Store', subtitle: 'Order tracking and delivery support', phone: '+1 202 555 0107', website: 'northwind-store.example', email: 'support@northwind-store.example', verified: true, banner: '/assets/ecommerce/package.svg', images: [] },
    restaurant: { displayName: 'Riverside Bistro', subtitle: 'Reservations and dining support', phone: '+1 202 555 0116', website: 'riverside-bistro.example', email: 'hello@riverside-bistro.example', verified: false, banner: '/assets/restaurant/restaurant-table.svg', images: [] },
    beerlao: { displayName: 'Beerlao', subtitle: 'Account access and event information', phone: '+1 202 555 0125', website: 'beerlao.example', email: 'support@beerlao.example', verified: true, banner: '/assets/beerlao/event-boun-souang-heua-promo.png', images: ['/assets/beerlao/event-boun-souang-heua-promo.png'] },
    'progadget-laos': { displayName: 'Pro Gadget Laos', subtitle: 'Orders, products, and delivery support', phone: '+1 202 555 0134', website: 'progadget-laos.example', email: 'support@progadget-laos.example', verified: true, banner: '/assets/progadget-laos/garmin_cirqa.jpeg', images: ['/assets/progadget-laos/garmin_cirqa.jpeg'] },
    'ltc-lao-telecom': { displayName: 'Lao Telecom', subtitle: 'Mobile account and service support', phone: '+1 202 555 0143', website: 'laotelecom.example', email: 'support@laotelecom.example', verified: true, banner: '/assets/ltc-lao-telecom/banner.jpeg', images: ['/assets/ltc-lao-telecom/banner.jpeg'] },
  } as const

  const collectCustomerText = (value: unknown, key = ''): string[] => {
    if (typeof value === 'string') {
      if (key === 'id' || key === 'startScenarioId' || key === 'image' || key === 'imageUrls' || key.toLowerCase().endsWith('url') || value.startsWith('/assets/')) return []
      return [value]
    }
    if (Array.isArray(value)) return value.flatMap((item) => collectCustomerText(item, key))
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([childKey, childValue]) => collectCustomerText(childValue, childKey))
    return []
  }

  it('audits all nine profile fixtures, owned assets, contacts, and customer-facing identity', () => {
    expect(BUILT_IN_SCENARIOS).toHaveLength(9)
    const authoredTriggers = new Set(['SIA START', 'DOMINOS START', 'VBANK START', 'RCS MENU'])
    for (const scenario of BUILT_IN_SCENARIOS) {
      const parsed = parseFlowSource(scenario.source, 'yaml')
      expect(parsed.success).toBe(true)
      if (!parsed.success) continue
      const flow = flowDefinitionSchema.parse(parsed.data)
      const profile = flow.brand.rcsProfile
      expect(profile).toBeDefined()
      if (!profile) continue
      const fixture = expected[scenario.id as keyof typeof expected]
      expect(fixture).toBeDefined()
      expect(profile).toMatchObject({ displayName: fixture.displayName, subtitle: fixture.subtitle, brandLabel: fixture.displayName, phone: fixture.phone, websiteLabel: fixture.website, websiteUrl: `https://${fixture.website}`, email: fixture.email, imageUrls: fixture.images })
      expect(flow.brand.banner).toBe(fixture.banner)
      expect(flow.brand.verified).toBe(fixture.verified)
      expect(profile.imageCount === 0).toBe(fixture.images.length === 0)
      expect(profile.imageCount).toBeGreaterThanOrEqual(fixture.images.length)
      for (const asset of [fixture.banner, ...fixture.images]) expect(existsSync(resolve(process.cwd(), 'public', asset.slice(1).replaceAll('%20', ' ')))).toBe(true)
      if (flow.metadata.channel === 'rcs') expect(authoredTriggers.has(flow.metadata.trigger ?? '')).toBe(true)
      expect(collectCustomerText(flow).join('\\n').match(/demo|fictional|romain|vonage|localhost/i), `${scenario.id} contains forbidden customer-facing text`).toBeNull()
    }
    expect([...authoredTriggers]).toHaveLength(4)
  })
})