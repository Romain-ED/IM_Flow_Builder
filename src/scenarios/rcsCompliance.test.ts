import { describe, it, expect } from 'vitest'
import { BUILT_IN_SCENARIOS } from './index'
import { parseFlowSource } from '../utils/flowSource'
import { validateFlowWithChannelCompliance } from '../channels/validateChannelCompliance'
import { getCapabilityWarning, isMessageTypeSupported } from '../channels/capabilities'
import { rcsCapabilities } from '../channels/rcs/capabilities'
import { flowDefinitionSchema, type FlowDefinition } from '../schema/flow'
import type { Action, RenderableMessage } from '../schema/messages'
import { deepInterpolate } from '../engine/templateRenderer'

/**
 * Independent copy of Google's published RCS for Business limits. It is
 * deliberately NOT derived from `rcsCapabilities`, so a wrong constant there
 * (or a drifting check) is caught by comparing the two.
 *
 * Sources (checked 2026-10-13):
 * - Rich cards guide: https://developers.google.com/business-communications/rcs-business-messaging/guides/learn/rich-cards
 *   title 200, description 2000, 4 suggestions per card, up to 11 chips below a
 *   card, suggestion text 25, carousel up to 10 cards.
 * - agentMessages reference: https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/phones.agentMessages
 *   text 3072, 11 suggestions per content message, carousel min 2 / max 10 cards.
 */
const OFFICIAL_RCS_LIMITS = {
  textMaxChars: 3072,
  cardTitleMaxChars: 200,
  cardDescriptionMaxChars: 2000,
  suggestionLabelMaxChars: 25,
  suggestionsPerRichCard: 4,
  suggestionsPerCarouselCard: 4,
  chipsPerContentMessage: 11,
  carouselMinCards: 2,
  carouselMaxCards: 10,
} as const

/** Pseudo-messages that never reach the renderer's capability check. */
const PSEUDO_TYPES = ['typing', 'delay']

describe('official RCS limits table matches rcsCapabilities constants', () => {
  it('has the same numbers as the capability constants', () => {
    expect({
      textMaxChars: rcsCapabilities.maxTextLength,
      cardTitleMaxChars: rcsCapabilities.maxCardTitleLength,
      cardDescriptionMaxChars: rcsCapabilities.maxCardDescriptionLength,
      suggestionLabelMaxChars: rcsCapabilities.maxButtonLabelLength,
      suggestionsPerRichCard: rcsCapabilities.maxRichCardSuggestions,
      suggestionsPerCarouselCard: rcsCapabilities.maxCarouselCardButtons,
      chipsPerContentMessage: rcsCapabilities.maxSuggestedReplies,
      carouselMaxCards: rcsCapabilities.maxCarouselCards,
    }).toEqual({
      textMaxChars: OFFICIAL_RCS_LIMITS.textMaxChars,
      cardTitleMaxChars: OFFICIAL_RCS_LIMITS.cardTitleMaxChars,
      cardDescriptionMaxChars: OFFICIAL_RCS_LIMITS.cardDescriptionMaxChars,
      suggestionLabelMaxChars: OFFICIAL_RCS_LIMITS.suggestionLabelMaxChars,
      suggestionsPerRichCard: OFFICIAL_RCS_LIMITS.suggestionsPerRichCard,
      suggestionsPerCarouselCard: OFFICIAL_RCS_LIMITS.suggestionsPerCarouselCard,
      chipsPerContentMessage: OFFICIAL_RCS_LIMITS.chipsPerContentMessage,
      carouselMaxCards: OFFICIAL_RCS_LIMITS.carouselMaxCards,
    })
    expect(rcsCapabilities.maxSuggestedActions).toBe(OFFICIAL_RCS_LIMITS.chipsPerContentMessage)
  })

  it('does not apply RCS limits to a native list (RCS has none)', () => {
    expect(rcsCapabilities.maxListRows).toBe(0)
    expect(isMessageTypeSupported(rcsCapabilities, 'list')).toBe(false)
  })
})

/** Rule violations found by the independent checker, as human-readable strings. */
function findLimitViolations(message: RenderableMessage): string[] {
  const out: string[] = []
  const L = OFFICIAL_RCS_LIMITS
  const labels = (actions: Array<{ label: string }>, where: string) => {
    for (const a of actions) {
      if (a.label.length > L.suggestionLabelMaxChars) {
        out.push(`label limit ${L.suggestionLabelMaxChars}: "${a.label}" (${a.label.length}) in ${where}`)
      }
    }
  }
  const cardText = (title: string, description: string | undefined, where: string) => {
    if (title.length > L.cardTitleMaxChars) out.push(`title limit ${L.cardTitleMaxChars}: ${title.length} chars in ${where}`)
    if (description && description.length > L.cardDescriptionMaxChars) {
      out.push(`description limit ${L.cardDescriptionMaxChars}: ${description.length} chars in ${where}`)
    }
  }
  switch (message.type) {
    case 'text':
      if (message.text.length > L.textMaxChars) out.push(`text limit ${L.textMaxChars}: ${message.text.length} chars`)
      break
    case 'rich_card': {
      cardText(message.title, message.description, `rich_card "${message.title}"`)
      const actions = message.actions ?? []
      if (actions.length > L.suggestionsPerRichCard) {
        out.push(`rich-card suggestions limit ${L.suggestionsPerRichCard}: ${actions.length} in "${message.title}"`)
      }
      labels(actions, `rich_card "${message.title}"`)
      break
    }
    case 'carousel': {
      if (message.cards.length < L.carouselMinCards || message.cards.length > L.carouselMaxCards) {
        out.push(`carousel cards limit ${L.carouselMinCards}-${L.carouselMaxCards}: ${message.cards.length} cards`)
      }
      for (const card of message.cards) {
        cardText(card.title, card.description, `carousel card "${card.id}"`)
        const actions = card.actions ?? []
        if (actions.length > L.suggestionsPerCarouselCard) {
          out.push(`carousel-card suggestions limit ${L.suggestionsPerCarouselCard}: ${actions.length} in card "${card.id}"`)
        }
        labels(actions, `carousel card "${card.id}"`)
      }
      break
    }
    case 'suggested_replies':
      if (message.options.length > L.chipsPerContentMessage) {
        out.push(`chip limit ${L.chipsPerContentMessage}: ${message.options.length} suggested_replies`)
      }
      labels(message.options, 'suggested_replies')
      break
    case 'suggested_actions':
      if (message.actions.length > L.chipsPerContentMessage) {
        out.push(`chip limit ${L.chipsPerContentMessage}: ${message.actions.length} suggested_actions`)
      }
      labels(message.actions as Action[], 'suggested_actions')
      break
    default:
      break
  }
  return out
}

/** Chips attached to one content message = the suggested_* message that directly follows it (plus node-level actions on the last message). */
function chipCountViolations(flow: FlowDefinition): Array<{ nodeId: string; rule: string }> {
  const out: Array<{ nodeId: string; rule: string }> = []
  for (const node of flow.nodes) {
    const messages = node.messages ?? []
    const last = messages[messages.length - 1]
    const trailing =
      last?.type === 'suggested_replies' ? last.options.length : last?.type === 'suggested_actions' ? last.actions.length : 0
    const nodeActions = node.actions?.length ?? 0
    if (trailing + nodeActions > OFFICIAL_RCS_LIMITS.chipsPerContentMessage) {
      out.push({
        nodeId: node.id,
        rule: `chip limit ${OFFICIAL_RCS_LIMITS.chipsPerContentMessage}: ${trailing} trailing + ${nodeActions} node actions`,
      })
    }
    for (const action of node.actions ?? []) {
      if (action.label.length > OFFICIAL_RCS_LIMITS.suggestionLabelMaxChars) {
        out.push({
          nodeId: node.id,
          rule: `label limit ${OFFICIAL_RCS_LIMITS.suggestionLabelMaxChars}: "${action.label}" (${action.label.length}) in node actions`,
        })
      }
    }
  }
  return out
}

// Scenarios whose authored channel is RCS, or that declare no channel and so
// must fit RCS as well as WhatsApp.
const rcsTargetScenarios = BUILT_IN_SCENARIOS.filter((scenario) => {
  const parsed = parseFlowSource(scenario.source, 'yaml')
  if (!parsed.success) return true // surfaced by the test below
  const channel = (parsed.data as { metadata?: { channel?: string } }).metadata?.channel
  return channel === undefined || channel === 'rcs'
})

describe('built-in RCS and channel-agnostic scenarios comply with the official RCS limits', () => {
  it('finds at least one RCS-targeted built-in scenario', () => {
    expect(rcsTargetScenarios.length).toBeGreaterThan(0)
  })

  for (const scenario of rcsTargetScenarios) {
    describe(scenario.id, () => {
      const parsed = parseFlowSource(scenario.source, 'yaml')

      it('passes hard validation as an RCS flow', () => {
        expect(parsed.success, `${scenario.id}: YAML did not parse`).toBe(true)
        if (!parsed.success) return
        // Force the RCS channel so channel-agnostic flows are judged as RCS too.
        const raw = parsed.data as { metadata: Record<string, unknown> }
        const result = validateFlowWithChannelCompliance({ ...raw, metadata: { ...raw.metadata, channel: 'rcs' } })
        if (!result.success) {
          throw new Error(
            `${scenario.id} hard errors:\n${result.errors.map((e) => `  node ${e.nodeId ?? '?'}: ${e.message}`).join('\n')}`,
          )
        }
      })

      it('has no unsupported-type fallbacks, capability warnings, or limit violations', () => {
        if (!parsed.success) throw new Error(`${scenario.id}: YAML did not parse`)
        const flow = flowDefinitionSchema.parse(parsed.data)
        const variables = flow.variables ?? {}
        const problems: string[] = []

        for (const node of flow.nodes) {
          for (const [index, authored] of (node.messages ?? []).entries()) {
            if (PSEUDO_TYPES.includes(authored.type)) continue
            const where = `${scenario.id} / node "${node.id}" / message #${index + 1} (${authored.type})`
            // Same interpolation the renderer applies before checking capabilities.
            const message = deepInterpolate(authored, variables) as RenderableMessage

            if (!isMessageTypeSupported(rcsCapabilities, message.type)) {
              problems.push(`${where}: rule "unsupported-type fallback" — RCS has no native ${message.type}`)
              continue
            }
            const warning = getCapabilityWarning(rcsCapabilities, message)
            if (warning) problems.push(`${where}: rule "getCapabilityWarning" — ${warning}`)
            for (const violation of findLimitViolations(message)) {
              problems.push(`${where}: rule "${violation}"`)
            }
          }
        }
        for (const { nodeId, rule } of chipCountViolations(flow)) {
          problems.push(`${scenario.id} / node "${nodeId}": rule "${rule}"`)
        }

        expect(problems, `\n${problems.join('\n')}\n`).toEqual([])
      })
    })
  }
})

describe('the compliance checker itself', () => {
  it('flags a violation with scenario, node and rule when a limit is broken', () => {
    const tooLong = 'x'.repeat(OFFICIAL_RCS_LIMITS.cardTitleMaxChars + 1)
    const message: RenderableMessage = { type: 'rich_card', sender: 'business', title: tooLong, actions: [] }
    expect(findLimitViolations(message).join()).toContain('title limit 200')
    expect(getCapabilityWarning(rcsCapabilities, message)).not.toBeNull()
  })

  it('flags a single-card carousel and 5 suggestions in a card', () => {
    const carousel: RenderableMessage = { type: 'carousel', sender: 'business', cards: [{ id: 'only', title: 'One' }] }
    expect(findLimitViolations(carousel).join()).toContain('carousel cards limit 2-10')
    const card: RenderableMessage = {
      type: 'rich_card',
      sender: 'business',
      title: 'Five',
      actions: Array.from({ length: 5 }, (_, i) => ({ type: 'reply' as const, label: `A${i}` })),
    }
    expect(findLimitViolations(card).join()).toContain('rich-card suggestions limit 4')
  })
})
