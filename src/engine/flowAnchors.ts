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

/** The single button of a message that moves the flow on: OTP, payment, calendar, WhatsApp flow. */
export function buttonAnchor(messageIndex: number): string {
  return `message-${messageIndex}-button`
}

/** Condition branches leave from separate points on the node's right edge, so they do not overlap. */
export const CONDITION_THEN_ANCHOR = 'condition-then'
export const CONDITION_ELSE_ANCHOR = 'condition-else'

/** A button from the node-level `actions` list, shown after the node's messages. */
export function nodeActionAnchor(actionIndex: number): string {
  return `node-action-${actionIndex}`
}
