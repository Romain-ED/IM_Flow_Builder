/**
 * Stable IDs for every button that can carry a transition. The flow chart
 * draws one arrow per anchor, and the same IDs are written onto the rendered
 * buttons, so each arrow starts at the button that causes it.
 *
 * `messageIndex` is the message's position in the node's authored `messages`
 * array, so the ID does not change when the chart merges or skips messages.
 */
export const NODE_ANCHOR = 'node'

export function optionAnchor(messageIndex: number, optionIndex: number): string {
  return `message-${messageIndex}-option-${optionIndex}`
}

export function actionAnchor(messageIndex: number, actionIndex: number): string {
  return `message-${messageIndex}-action-${actionIndex}`
}

export function rowAnchor(messageIndex: number, rowIndex: number): string {
  return `message-${messageIndex}-row-${rowIndex}`
}

export function cardActionAnchor(messageIndex: number, cardIndex: number, actionIndex: number): string {
  return `message-${messageIndex}-card-${cardIndex}-action-${actionIndex}`
}

/** A button from the node-level `actions` list, shown after the node's messages. */
export function nodeActionAnchor(actionIndex: number): string {
  return `node-action-${actionIndex}`
}
