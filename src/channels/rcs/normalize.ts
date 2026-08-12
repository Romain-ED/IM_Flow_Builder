import type { Message, MessageType } from '../../schema/messages'
import { trailingButtonCount } from '../../engine/messageAttachment'
import { maxTrailingButtons } from '../capabilities'
import { rcsCapabilities } from './capabilities'

/**
 * Mirrors Google's real `AgentMessage`/`AgentContentMessage` shape — content
 * is exactly text, an uploaded file, or a rich card (standalone or in a
 * carousel), each optionally carrying `suggestions` (chips). Building one
 * of these (or failing to, with a hard error) is what "as close to the real
 * thing as possible" means structurally for RCS.
 */
export type RcsNormalizedMessage =
  | { kind: 'text'; suggestionCount: number }
  | { kind: 'uploaded_file'; suggestionCount: number }
  | { kind: 'rich_card'; suggestionCount: number }
  | { kind: 'carousel'; cardCount: number }
  | { kind: 'location' }
  | { kind: 'system_action' }

export interface RcsNormalizeResult {
  normalized: RcsNormalizedMessage[]
  errors: string[]
}

/**
 * Unlike WhatsApp (which requires body *text* specifically), RCS
 * suggestion chips attach to whichever real content message precedes them
 * — text, an uploaded file, or a rich card all qualify as an
 * `AgentContentMessage` a chip can ride along with. This is intentionally
 * broader than `engine/messageAttachment.ts`'s `isAttachableOwner`, which
 * is WhatsApp-specific (text-only) — reusing that predicate here would
 * incorrectly flag valid RCS content (e.g. a rich_card followed directly
 * by suggested_replies, with no text in between) as an error.
 */
const RCS_ATTACHABLE_OWNER_TYPES: MessageType[] = ['text', 'image', 'video', 'document', 'rich_card', 'carousel']

function isRcsAttachableOwner(message: Message): boolean {
  return (
    RCS_ATTACHABLE_OWNER_TYPES.includes(message.type) &&
    'sender' in message &&
    (message.sender ?? 'business') === 'business'
  )
}

function isRcsAttachableTrailing(message: Message): boolean {
  return message.type === 'suggested_replies' || message.type === 'suggested_actions'
}

/**
 * Walks one node's raw authored messages (pre-interpolation, same stage
 * `flowValidator` operates at). See `whatsapp/normalize.ts` for the shared
 * rationale (count/structural hard errors only, not length — that stays a
 * live soft warning; unsupported types are an intentional soft fallback,
 * not validated here).
 */
export function normalizeForRcs(messages: Message[]): RcsNormalizeResult {
  const normalized: RcsNormalizedMessage[] = []
  const errors: string[] = []
  let skipNext = false

  for (let i = 0; i < messages.length; i++) {
    if (skipNext) {
      skipNext = false
      continue
    }
    const message = messages[i]
    const next = messages[i + 1]
    if (!rcsCapabilities.supportedMessageTypes.includes(message.type)) continue

    const attachedSuggestions =
      isRcsAttachableOwner(message) && next && isRcsAttachableTrailing(next) ? trailingButtonCount(next) : 0

    if (attachedSuggestions > 0) {
      // attachedSuggestions > 0 only when the ternary above found `next` truthy.
      const limit = maxTrailingButtons(rcsCapabilities, next!.type as 'suggested_replies' | 'suggested_actions')
      if (attachedSuggestions > limit) {
        errors.push(
          `Suggestions attached to a ${message.type} message total ${attachedSuggestions} — RCS allows at most ${limit} per message.`,
        )
        skipNext = true
        continue
      }
      skipNext = true
    }

    switch (message.type) {
      case 'text':
        normalized.push({ kind: 'text', suggestionCount: attachedSuggestions })
        break
      case 'suggested_replies':
      case 'suggested_actions':
        // Not consumed by the attach check above, so no real content
        // message precedes it — a real RCS AgentMessage can't carry
        // suggestions with no content message.
        errors.push(
          `A standalone "${message.type}" message has no preceding content — RCS suggestion chips always attach to a text, file, or rich card message, never floating alone.`,
        )
        break
      case 'image':
      case 'video':
      case 'document':
        normalized.push({ kind: 'uploaded_file', suggestionCount: attachedSuggestions })
        break
      case 'location':
        normalized.push({ kind: 'location' })
        break
      case 'rich_card': {
        const buttonCount = message.actions?.length ?? 0
        if (buttonCount > rcsCapabilities.maxSuggestedActions) {
          errors.push(
            `rich_card "${message.title}" has ${buttonCount} buttons — RCS rich cards allow at most ${rcsCapabilities.maxSuggestedActions}.`,
          )
        } else {
          normalized.push({ kind: 'rich_card', suggestionCount: attachedSuggestions })
        }
        break
      }
      case 'carousel': {
        if (message.cards.length > rcsCapabilities.maxCarouselCards) {
          errors.push(`carousel has ${message.cards.length} cards — RCS allows at most ${rcsCapabilities.maxCarouselCards}.`)
        }
        if (message.cards.length < 2) {
          errors.push(
            "RCS carousels require at least 2 cards — Google's spec sends a single card as a standalone rich card instead.",
          )
        }
        for (const card of message.cards) {
          const buttonCount = card.actions?.length ?? 0
          if (rcsCapabilities.maxCarouselCardButtons && buttonCount > rcsCapabilities.maxCarouselCardButtons) {
            errors.push(
              `Carousel card "${card.title}" has ${buttonCount} buttons — RCS carousel cards allow at most ${rcsCapabilities.maxCarouselCardButtons}.`,
            )
          }
        }
        normalized.push({ kind: 'carousel', cardCount: message.cards.length })
        break
      }
      case 'system_action':
        normalized.push({ kind: 'system_action' })
        break
      default:
        break
    }
  }

  return { normalized, errors }
}
