import type { Condition, FlowNode } from '../schema/flow'
import type { Message, RenderableMessage } from '../schema/messages'
import type { NormalizedMessage } from './types'
import { computeMessageAttachments } from './messageAttachment'
import { actionAnchor, nodeActionAnchor, optionAnchor } from './flowAnchors'

/**
 * Width of a chart node's bubble column, in CSS pixels. This is a standalone RCS
 * card on a 412 DP phone (screen minus 16 DP). At this width the ratios in
 * `channels/rcs/mediaRatios.ts` give Google's 112, 168, and 264 DP media heights.
 */
export const CHART_BUBBLE_WIDTH = 396
/** RCS carousel card width on the chart: Google's medium card width, in DP. */
export const CHART_CARD_WIDTH = 296
/** WhatsApp carousel card width, the same fixed width the phone uses. */
export const WHATSAPP_CAROUSEL_CARD_WIDTH = 200
/** Gap between carousel cards, the same as the phone's `gap-2.5`. */
export const CAROUSEL_CARD_GAP = 10

/** Width of a carousel's strip when every card is shown side by side. */
export function carouselStripWidth(cardCount: number, cardWidth: number): number {
  return cardCount * cardWidth + Math.max(0, cardCount - 1) * CAROUSEL_CARD_GAP
}

const OPERATOR_TEXT: Record<Condition['operator'], string> = {
  equals: '=',
  not_equals: '≠',
  exists: 'exists',
  contains: 'contains',
  greater_than: '>',
  less_than: '<',
}

/** One-line description of a branch, e.g. "plan = premium" or "email exists". */
export function conditionSummary(condition: Condition): string {
  if (condition.operator === 'exists') return `${condition.variable} exists`
  return `${condition.variable} ${OPERATOR_TEXT[condition.operator]} ${String(condition.value ?? '')}`.trimEnd()
}

export interface ChartTrailingItem {
  anchor: string
  label: string
}

export interface ChartBubble {
  message: NormalizedMessage
  /** Position of this message in the node's authored `messages` array. Used for anchors. */
  messageIndex: number
  /** Buttons drawn attached under this bubble, WhatsApp style. Empty on RCS. */
  attached: ChartTrailingItem[]
}

export interface ChartNodeItems {
  nodeId: string
  bubbles: ChartBubble[]
  /** Node-level buttons drawn as a chip row under the bubbles when they are not attached. */
  floating: ChartTrailingItem[]
  /**
   * Width of the node's content area. It is `CHART_BUBBLE_WIDTH`, or wider when a
   * carousel strip needs more room.
   */
  contentWidth: number
  /** Branch description for a condition node, shown as a text card. */
  condition?: string
}

function isRenderable(message: Message): message is RenderableMessage {
  return message.type !== 'delay' && message.type !== 'typing'
}

/** Buttons a suggestion message offers. Other message types offer none. */
function suggestionItems(message: RenderableMessage, messageIndex: number): ChartTrailingItem[] {
  switch (message.type) {
    case 'suggested_replies':
      return message.options.map((option, j) => ({ anchor: optionAnchor(messageIndex, j), label: option.label }))
    case 'suggested_actions':
      return message.actions.map((action, j) => ({ anchor: actionAnchor(messageIndex, j), label: action.label }))
    default:
      return []
  }
}

/**
 * Turns one authored node into the bubbles the flow chart draws, using the same
 * attachment rules as the live conversation. Values are not interpolated, so
 * placeholders such as {{customerName}} stay as written.
 *
 * @param canAttach True for channels whose buttons sit inside the message card
 *   (WhatsApp style). False for channels that show suggestion chips as their
 *   own row (RCS).
 * @param carouselCardWidth Width each carousel card is drawn at on this channel.
 */
export function buildChartNodeItems(
  node: FlowNode,
  canAttach: boolean,
  carouselCardWidth: number = CHART_CARD_WIDTH,
): ChartNodeItems {
  const history: NormalizedMessage[] = []
  const messageIndexByRuntimeId = new Map<string, number>()

  const authored = node.messages ?? []
  authored.forEach((message, messageIndex) => {
    if (!isRenderable(message)) return
    const runtimeId = `${node.id}:${messageIndex}`
    messageIndexByRuntimeId.set(runtimeId, messageIndex)
    history.push({ runtimeId, nodeId: node.id, timestamp: 0, message })
  })

  const bubbles: ChartBubble[] = computeMessageAttachments(history, canAttach).map((entry) => {
    const messageIndex = messageIndexByRuntimeId.get(entry.message.runtimeId) ?? -1
    const attachedIndex = entry.attached ? messageIndexByRuntimeId.get(entry.attached.runtimeId) : undefined
    return {
      message: entry.message,
      messageIndex,
      attached: entry.attached && attachedIndex !== undefined ? suggestionItems(entry.attached.message, attachedIndex) : [],
    }
  })

  const stripWidths = authored.flatMap((message) =>
    message.type === 'carousel' ? [carouselStripWidth(message.cards.length, carouselCardWidth)] : [],
  )
  const contentWidth = Math.max(CHART_BUBBLE_WIDTH, ...stripWidths)
  const condition = node.condition ? conditionSummary(node.condition) : undefined

  const pending: ChartTrailingItem[] = (node.actions ?? []).map((choice, j) => ({
    anchor: nodeActionAnchor(j),
    label: choice.label,
  }))
  if (pending.length === 0) return { nodeId: node.id, bubbles, floating: [], contentWidth, condition }

  // Same rule as the live conversation: node-level buttons attach only to a
  // trailing business text bubble that has no suggestions attached yet.
  const last = bubbles[bubbles.length - 1]
  const canAttachPending =
    canAttach &&
    last !== undefined &&
    last.attached.length === 0 &&
    last.message.message.type === 'text' &&
    (last.message.message.sender ?? 'business') === 'business'

  if (canAttachPending && last) {
    last.attached = pending
    return { nodeId: node.id, bubbles, floating: [], contentWidth, condition }
  }
  return { nodeId: node.id, bubbles, floating: pending, contentWidth, condition }
}
