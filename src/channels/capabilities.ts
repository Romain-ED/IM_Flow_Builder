import type { ChannelId } from '../schema/flow'
import type { MessageType, RenderableMessage } from '../schema/messages'

export interface ChannelCapabilities {
  channel: ChannelId
  label: string
  /** Message types this channel can render using its native visual language. */
  supportedMessageTypes: MessageType[]
  /** Max chips/buttons on a standalone suggested_replies message (WhatsApp: 3 reply buttons; RCS: 11 suggestion chips per Google's spec). */
  maxSuggestedReplies: number
  /** Max buttons on a standalone suggested_actions message (RCS: 4 suggestions per rich card/message). */
  maxSuggestedActions: number
  /** Max cards in a carousel (RCS: 10; WhatsApp: 10 via a Carousel Template). */
  maxCarouselCards: number
  /** Max buttons per carousel card (RCS: 4, same as a rich card; WhatsApp Carousel Templates: 2). */
  maxCarouselCardButtons?: number
  /** Max list rows, summed across all sections (WhatsApp: 10 total rows across up to 10 sections). */
  maxListRows: number
  /** Max characters on a button/chip label, if the real platform truncates or rejects longer text (WhatsApp reply buttons: 20; RCS suggestion chips: 25). */
  maxButtonLabelLength?: number
  /** Max characters on a list row title (WhatsApp: 24). */
  maxListRowTitleLength?: number
  /** Max characters on a rich card / carousel card title (RCS: 200). */
  maxCardTitleLength?: number
  /** Max characters on a rich card / carousel card description (RCS: 2000). */
  maxCardDescriptionLength?: number
  /** Human-readable explanation shown in debug mode when a type falls back. */
  fallbackNotes: Partial<Record<MessageType, string>>
}

export function isMessageTypeSupported(
  capabilities: ChannelCapabilities,
  type: MessageType,
): boolean {
  return capabilities.supportedMessageTypes.includes(type)
}

/**
 * The real button/chip cap for whichever of `suggested_replies` (reply-type
 * chips) or `suggested_actions` (action-type chips/buttons) is being
 * checked — the two aren't the same limit on RCS (11 vs 4 per Google's
 * spec), so callers must not use `maxSuggestedActions` as a stand-in for
 * both. Shared by `getCapabilityWarning` below and the WhatsApp/RCS
 * `normalize.ts` hard-validators, so the two can't drift.
 */
export function maxTrailingButtons(
  capabilities: ChannelCapabilities,
  type: 'suggested_replies' | 'suggested_actions',
): number {
  return type === 'suggested_replies' ? capabilities.maxSuggestedReplies : capabilities.maxSuggestedActions
}

export function getFallbackNote(
  capabilities: ChannelCapabilities,
  type: MessageType,
): string {
  return (
    capabilities.fallbackNotes[type] ??
    `This component is not natively supported on ${capabilities.label}. Rendered using a generic fallback.`
  )
}

/**
 * Checks a fully-interpolated message against the real platform's structural
 * limits (button/row counts, label lengths, carousel size) — the numbers
 * declared on `ChannelCapabilities` above, sourced from Meta's WhatsApp
 * Cloud API docs and Google's RCS Business Messaging spec. Returns `null`
 * when the message is within spec. This is advisory (shown as a debug-mode
 * note, like `getFallbackNote`) rather than blocking, since a scenario
 * author may be deliberately previewing content that only fits on one
 * channel.
 */
export function getCapabilityWarning(
  capabilities: ChannelCapabilities,
  message: RenderableMessage,
): string | null {
  const tooLongLabel = (labels: string[]): string | null => {
    if (!capabilities.maxButtonLabelLength) return null
    const longest = labels.reduce((a, b) => (b.length > a.length ? b : a), '')
    return longest.length > capabilities.maxButtonLabelLength
      ? `"${longest}" is ${longest.length} characters — ${capabilities.label} truncates button/chip labels to ${capabilities.maxButtonLabelLength}.`
      : null
  }

  switch (message.type) {
    case 'suggested_replies': {
      if (message.options.length > capabilities.maxSuggestedReplies) {
        return `${capabilities.label} supports at most ${capabilities.maxSuggestedReplies} suggested replies (this message has ${message.options.length}).`
      }
      return tooLongLabel(message.options.map((o) => o.label))
    }
    case 'suggested_actions': {
      if (message.actions.length > capabilities.maxSuggestedActions) {
        return `${capabilities.label} supports at most ${capabilities.maxSuggestedActions} action buttons (this message has ${message.actions.length}).`
      }
      return tooLongLabel(message.actions.map((a) => a.label))
    }
    case 'carousel': {
      if (message.cards.length > capabilities.maxCarouselCards) {
        return `${capabilities.label} supports at most ${capabilities.maxCarouselCards} carousel cards (this message has ${message.cards.length}).`
      }
      if (capabilities.channel === 'rcs' && message.cards.length < 2) {
        return 'RCS carousels require at least 2 cards — Google\'s spec sends a single card as a standalone rich card instead.'
      }
      for (const card of message.cards) {
        if (capabilities.maxCardTitleLength && card.title.length > capabilities.maxCardTitleLength) {
          return `Card title "${card.title}" is ${card.title.length} characters — ${capabilities.label} caps titles at ${capabilities.maxCardTitleLength}.`
        }
        if (
          card.description &&
          capabilities.maxCardDescriptionLength &&
          card.description.length > capabilities.maxCardDescriptionLength
        ) {
          return `A card description is ${card.description.length} characters — ${capabilities.label} caps descriptions at ${capabilities.maxCardDescriptionLength}.`
        }
        if (
          capabilities.maxCarouselCardButtons &&
          card.actions &&
          card.actions.length > capabilities.maxCarouselCardButtons
        ) {
          return `Card "${card.title}" has ${card.actions.length} buttons — ${capabilities.label} caps carousel card buttons at ${capabilities.maxCarouselCardButtons}.`
        }
      }
      return null
    }
    case 'rich_card': {
      if (capabilities.maxCardTitleLength && message.title.length > capabilities.maxCardTitleLength) {
        return `Card title "${message.title}" is ${message.title.length} characters — ${capabilities.label} caps titles at ${capabilities.maxCardTitleLength}.`
      }
      if (
        message.description &&
        capabilities.maxCardDescriptionLength &&
        message.description.length > capabilities.maxCardDescriptionLength
      ) {
        return `This description is ${message.description.length} characters — ${capabilities.label} caps descriptions at ${capabilities.maxCardDescriptionLength}.`
      }
      if (message.actions && message.actions.length > capabilities.maxSuggestedActions) {
        return `${capabilities.label} supports at most ${capabilities.maxSuggestedActions} buttons on a card (this one has ${message.actions.length}).`
      }
      return null
    }
    case 'list': {
      const rowCount = message.sections.reduce((sum, section) => sum + section.rows.length, 0)
      if (rowCount > capabilities.maxListRows) {
        return `${capabilities.label} supports at most ${capabilities.maxListRows} list rows total across all sections (this list has ${rowCount}).`
      }
      if (capabilities.maxListRowTitleLength) {
        for (const section of message.sections) {
          const tooLong = section.rows.find((r) => r.title.length > capabilities.maxListRowTitleLength!)
          if (tooLong) {
            return `Row title "${tooLong.title}" is ${tooLong.title.length} characters — ${capabilities.label} caps row titles at ${capabilities.maxListRowTitleLength}.`
          }
        }
      }
      return null
    }
    default:
      return null
  }
}
