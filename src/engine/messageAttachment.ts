import type { NormalizedMessage } from './types'
import type { Message, MessageType, Sender } from '../schema/messages'

/**
 * A real WhatsApp interactive message always carries its buttons as part of
 * the one message object that offered them — body text + buttons together,
 * never buttons as a second, standalone message. Our schema keeps
 * `suggested_replies`/`suggested_actions` as their own message type (so
 * scenario authors can attach them to *any* preceding content, not just
 * text), so this computes which pairs of adjacent history messages should
 * render merged into one card on channels where that matters.
 *
 * A `suggested_replies`/`suggested_actions` message is eligible to attach
 * to the message immediately before it when: that message is business
 * `text` (the only "body" type we treat as an attachable owner — a
 * `document`/`rich_card` header still needs body text on the real
 * platform, so we don't attach to those), and both messages come from the
 * same node (attaching across a node boundary would merge two logically
 * unrelated turns into one bubble).
 */
export interface MessageAttachmentEntry {
  message: NormalizedMessage
  /** The suggested_replies/suggested_actions message merged into this one, if any. */
  attached?: NormalizedMessage
}

/**
 * The pairing rule above, factored out so it can run against either fully
 * interpolated runtime messages (this file's live-render use, below) or raw
 * authored messages straight from a parsed `FlowDefinition` (used by
 * `channels/{whatsapp,rcs}/normalize.ts` for load-time hard validation) —
 * both shapes carry `type` and (where applicable) `sender`, which is all
 * the rule needs. Keeping one copy of the rule means the two call sites
 * can't drift on what counts as "attachable".
 */
export interface AttachableMessageLike {
  type: MessageType
  sender?: Sender
}

export function isAttachableTrailing(message: AttachableMessageLike): boolean {
  return message.type === 'suggested_replies' || message.type === 'suggested_actions'
}

export function isAttachableOwner(message: AttachableMessageLike): boolean {
  return message.type === 'text' && (message.sender ?? 'business') === 'business'
}

/**
 * Number of buttons/options a `suggested_replies`/`suggested_actions`
 * message carries — 0 for anything else. A plain switch rather than a
 * ternary off `isAttachableTrailing` so TypeScript actually narrows
 * `message` to the variant with an `options`/`actions` field; a boolean
 * helper call doesn't narrow the union for callers.
 */
export function trailingButtonCount(message: Message): number {
  switch (message.type) {
    case 'suggested_replies':
      return message.options.length
    case 'suggested_actions':
      return message.actions.length
    default:
      return 0
  }
}

/**
 * @param canAttach Whether the active channel's chip style even wants
 *   attachment — RCS legitimately renders suggestion chips as their own
 *   floating pill row below the card in the real UI (confirmed against
 *   Google's RCS spec), so this should be `false` there; only pass `true`
 *   for channels styled like WhatsApp.
 */
export function computeMessageAttachments(
  history: NormalizedMessage[],
  canAttach: boolean,
): MessageAttachmentEntry[] {
  const entries: MessageAttachmentEntry[] = []
  let skipNext = false

  for (let i = 0; i < history.length; i++) {
    if (skipNext) {
      skipNext = false
      continue
    }
    const message = history[i]
    const next = history[i + 1]
    const canMerge =
      canAttach &&
      isAttachableOwner(message.message) &&
      Boolean(next) &&
      next.nodeId === message.nodeId &&
      isAttachableTrailing(next.message)

    if (canMerge) {
      entries.push({ message, attached: next })
      skipNext = true
    } else {
      entries.push({ message })
    }
  }

  return entries
}
