import type { NormalizedMessage } from '../engine/types'

/**
 * An inline interactive message (suggested replies, list, carousel/rich-card
 * buttons, boarding pass actions…) stays tappable only while it still
 * belongs to the current node — once the flow has moved on, older messages
 * render as inert history. This single rule is what makes "previous choices"
 * visually disable themselves everywhere, uniformly.
 */
export function isMessageInteractive(
  message: NormalizedMessage,
  currentNodeId: string | null,
): boolean {
  return currentNodeId !== null && message.nodeId === currentNodeId
}

/** Finds the most recent `input` message still belonging to the current node, if any. */
export function findActiveInput(
  history: NormalizedMessage[],
  currentNodeId: string | null,
): NormalizedMessage | null {
  if (!currentNodeId) return null
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i]
    if (entry.nodeId !== currentNodeId) break
    if (entry.message.type === 'input') return entry
  }
  return null
}
