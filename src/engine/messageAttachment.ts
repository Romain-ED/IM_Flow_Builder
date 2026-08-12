import type { NormalizedMessage } from './types'

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

function isAttachableTrailing(message: NormalizedMessage): boolean {
  return message.message.type === 'suggested_replies' || message.message.type === 'suggested_actions'
}

function isAttachableOwner(message: NormalizedMessage): boolean {
  return message.message.type === 'text' && (message.message.sender ?? 'business') === 'business'
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
      isAttachableOwner(message) &&
      Boolean(next) &&
      next.nodeId === message.nodeId &&
      isAttachableTrailing(next)

    if (canMerge) {
      entries.push({ message, attached: next })
      skipNext = true
    } else {
      entries.push({ message })
    }
  }

  return entries
}
