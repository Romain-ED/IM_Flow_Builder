import type { Message } from '../../schema/messages'
import { isAttachableOwner, isAttachableTrailing, trailingButtonCount } from '../../engine/messageAttachment'
import { maxTrailingButtons } from '../capabilities'
import { whatsappCapabilities } from './capabilities'

/**
 * Mirrors the actual shape a WhatsApp Cloud API call would send — not this
 * app's generic cross-channel `Message` schema. Building one of these (or
 * failing to, with a hard error) is what "as close to the real thing as
 * possible" means structurally: content that can't become one of these
 * variants literally cannot be sent to a real WhatsApp Business number.
 */
export type WhatsAppNormalizedMessage =
  | { kind: 'text'; body: string }
  | { kind: 'media'; mediaType: 'image' | 'video' | 'document' }
  | { kind: 'location' }
  /** rich_card, or a text message merged with a following suggested_replies/suggested_actions — both are one real WhatsApp interactive message: body + up to 3 buttons. */
  | { kind: 'interactive_buttons'; body: string; buttonCount: number }
  /** A native WhatsApp list picker: body + a button that opens up to 10 rows. */
  | { kind: 'interactive_list'; body: string; rowCount: number }
  /** Meta's Carousel Template: up to 10 cards, up to 2 buttons each. */
  | { kind: 'carousel_template'; cardCount: number }
  | { kind: 'catalog' }
  | { kind: 'flow' }
  | { kind: 'system_action' }

export interface WhatsAppNormalizeResult {
  normalized: WhatsAppNormalizedMessage[]
  errors: string[]
}

/**
 * Walks one node's raw authored messages (pre-variable-interpolation — this
 * runs once at scenario-load time, same stage `flowValidator` already
 * operates at) and attempts to build the real WhatsApp payload shape for
 * each. Returns a hard error instead of a value wherever that's impossible
 * per Meta's actual limits (`whatsappCapabilities`) — count/structural
 * violations only (button counts, missing body text, carousel size); label
 * *length* limits stay a live, render-time soft warning
 * (`getCapabilityWarning`) since a `{{variable}}` can change a label's
 * length per run, which this load-time pass can't know.
 *
 * Message types WhatsApp doesn't natively support at all (e.g. the
 * no-official-basis `otp`/`payment_request`) are intentionally NOT
 * validated here — using an unsupported type is a deliberate,
 * already-handled soft fallback (`capabilities.ts`'s `supportedMessageTypes`
 * + `getFallbackNote`), not a structural violation of a type WhatsApp
 * claims to support. Don't turn "not supported" into a hard error here —
 * that's a different, intentionally softer, concern.
 */
export function normalizeForWhatsApp(messages: Message[]): WhatsAppNormalizeResult {
  const normalized: WhatsAppNormalizedMessage[] = []
  const errors: string[] = []
  let skipNext = false

  for (let i = 0; i < messages.length; i++) {
    if (skipNext) {
      skipNext = false
      continue
    }
    const message = messages[i]
    const next = messages[i + 1]
    if (!whatsappCapabilities.supportedMessageTypes.includes(message.type)) continue

    switch (message.type) {
      case 'text': {
        if (isAttachableOwner(message) && next && isAttachableTrailing(next)) {
          const buttonCount = trailingButtonCount(next)
          const limit = maxTrailingButtons(whatsappCapabilities, next.type as 'suggested_replies' | 'suggested_actions')
          if (buttonCount > limit) {
            errors.push(
              `"${next.type}" attached to "${truncate(message.text)}" has ${buttonCount} buttons — WhatsApp allows at most ${limit} on one interactive message.`,
            )
          } else {
            normalized.push({ kind: 'interactive_buttons', body: message.text, buttonCount })
          }
          skipNext = true
        } else {
          normalized.push({ kind: 'text', body: message.text })
        }
        break
      }
      case 'suggested_replies':
      case 'suggested_actions':
        // Reached only when NOT preceded by an eligible business text
        // message (the merge case above already consumed that pairing) —
        // a real WhatsApp interactive message can't be buttons with no
        // body text.
        errors.push(
          `A standalone "${message.type}" message has no body text — a real WhatsApp interactive message always carries body text with its buttons, never buttons alone. Add a preceding business text message.`,
        )
        break
      case 'image':
      case 'video':
      case 'document':
        normalized.push({ kind: 'media', mediaType: message.type })
        break
      case 'location':
        normalized.push({ kind: 'location' })
        break
      case 'rich_card': {
        const buttonCount = message.actions?.length ?? 0
        if (buttonCount > whatsappCapabilities.maxSuggestedActions) {
          errors.push(
            `rich_card "${message.title}" has ${buttonCount} buttons — WhatsApp interactive messages allow at most ${whatsappCapabilities.maxSuggestedActions}.`,
          )
        } else {
          normalized.push({ kind: 'interactive_buttons', body: message.description ?? message.title, buttonCount })
        }
        break
      }
      case 'list': {
        const rowCount = message.sections.reduce((sum, section) => sum + section.rows.length, 0)
        if (rowCount > whatsappCapabilities.maxListRows) {
          errors.push(
            `list "${message.title}" has ${rowCount} rows across all sections — WhatsApp allows at most ${whatsappCapabilities.maxListRows}.`,
          )
        } else {
          normalized.push({ kind: 'interactive_list', body: message.description ?? message.title, rowCount })
        }
        break
      }
      case 'carousel': {
        if (message.cards.length > whatsappCapabilities.maxCarouselCards) {
          errors.push(
            `carousel has ${message.cards.length} cards — WhatsApp's Carousel Template allows at most ${whatsappCapabilities.maxCarouselCards}.`,
          )
        }
        for (const card of message.cards) {
          const buttonCount = card.actions?.length ?? 0
          if (whatsappCapabilities.maxCarouselCardButtons && buttonCount > whatsappCapabilities.maxCarouselCardButtons) {
            errors.push(
              `Carousel card "${card.title}" has ${buttonCount} buttons — WhatsApp Carousel Template cards allow at most ${whatsappCapabilities.maxCarouselCardButtons}.`,
            )
          }
        }
        normalized.push({ kind: 'carousel_template', cardCount: message.cards.length })
        break
      }
      case 'product_catalog':
        normalized.push({ kind: 'catalog' })
        break
      case 'whatsapp_flow':
        normalized.push({ kind: 'flow' })
        break
      case 'system_action':
        normalized.push({ kind: 'system_action' })
        break
      default:
        // input, and any other supported-but-unconstrained type: no real
        // structural limit to enforce beyond what's checked above.
        break
    }
  }

  return { normalized, errors }
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
