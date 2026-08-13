import { describe, it, expect } from 'vitest'
import { BUILT_IN_SCENARIOS } from './index'
import { parseFlowSource } from '../utils/flowSource'
import { validateFlowWithChannelCompliance } from '../channels/validateChannelCompliance'
import { isMessageTypeSupported } from '../channels/capabilities'
import { whatsappCapabilities } from '../channels/whatsapp/capabilities'
import { rcsCapabilities } from '../channels/rcs/capabilities'
import { flowDefinitionSchema, type MessageType } from '../schema/flow'

describe('built-in scenarios', () => {
  for (const scenario of BUILT_IN_SCENARIOS) {
    it(`${scenario.id} parses, validates, and is compliant on both channels`, () => {
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

// Guards the promise CLAUDE.md makes for built-ins: every message type they
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
