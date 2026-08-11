import type { FlowDefinition, FlowNode } from '../schema/flow'
import type { Action, BoardingPassAction, Choice, ListRow, VariableMap } from '../schema/messages'
import { evaluateCondition } from './conditionEvaluator'
import { deepInterpolate } from './templateRenderer'
import type { InteractionResult, NodePlan, NormalizedMessage, PlayStep, NodeOutcome } from './types'
import { createId } from '../utils/id'

const DEFAULT_MESSAGE_DELAY_MS = 500
const DEFAULT_TYPING_DURATION_MS = 900

export function findNode(flow: FlowDefinition, nodeId: string): FlowNode | undefined {
  return flow.nodes.find((node) => node.id === nodeId)
}

/**
 * Whether a node's own messages carry some form of tappable interactivity
 * (inline replies, a list, an input, or action buttons on a card/boarding
 * pass), independent of the node-level `actions` bottom bar. Used to avoid
 * telling the presenter "conversation ended" while a message still has live
 * buttons, and to avoid flagging such nodes as dead-ends in validation.
 */
export function nodeHasInteractiveContent(node: FlowNode): boolean {
  return (node.messages ?? []).some((message) => {
    switch (message.type) {
      case 'suggested_replies':
      case 'list':
      case 'input':
      case 'suggested_actions':
      case 'boarding_pass':
      case 'location':
      case 'otp':
      case 'payment_request':
      case 'calendar_event':
      case 'product_catalog':
      case 'whatsapp_flow':
        return true
      case 'rich_card':
        return Boolean(message.actions?.length)
      case 'carousel':
        return message.cards.some((card) => card.actions?.length)
      default:
        return false
    }
  })
}

export function createInitialVariables(
  flow: FlowDefinition,
  overrides?: VariableMap,
): VariableMap {
  return { ...(flow.variables ?? {}), ...(overrides ?? {}) }
}

/**
 * Pure, synchronous computation of "what should happen when this node is
 * entered": the ordered list of typing/wait/message steps to play, and the
 * control-flow outcome once they're exhausted. Contains no timers and no
 * side effects, which makes it trivial to unit test and lets the caller
 * (the Zustand store) drive real wall-clock playback separately.
 */
export function computeNodePlan(
  flow: FlowDefinition,
  nodeId: string,
  variables: VariableMap,
): NodePlan {
  const node = findNode(flow, nodeId)
  if (!node) {
    return {
      nodeId,
      steps: [],
      outcome: { kind: 'error', message: `Node "${nodeId}" was not found in the flow.` },
    }
  }

  const effectiveVariables: VariableMap = { ...variables, ...(node.set ?? {}) }
  const defaults = flow.defaults ?? {}
  const messageDelayDefault = defaults.messageDelayMs ?? DEFAULT_MESSAGE_DELAY_MS
  const typingDefault = defaults.typingDurationMs ?? DEFAULT_TYPING_DURATION_MS

  const steps: PlayStep[] = []

  for (const entry of node.messages ?? []) {
    if (entry.type === 'delay') {
      if (entry.duration > 0) steps.push({ kind: 'wait', durationMs: entry.duration })
      continue
    }

    const interpolated = deepInterpolate(entry, effectiveVariables)
    const sender = interpolated.sender ?? 'business'

    if (sender === 'business' && interpolated.showTyping !== false) {
      const typingMs = interpolated.typingMs ?? typingDefault
      if (typingMs > 0) steps.push({ kind: 'typing', durationMs: typingMs })
    }

    const delayMs = interpolated.delayMs ?? messageDelayDefault
    if (delayMs > 0) steps.push({ kind: 'wait', durationMs: delayMs })

    const normalized: NormalizedMessage = {
      runtimeId: createId('msg'),
      nodeId,
      timestamp: Date.now(),
      message: interpolated,
    }
    steps.push({ kind: 'message', message: normalized })
  }

  let outcome: NodeOutcome
  if (node.condition) {
    const matched = evaluateCondition(node.condition, effectiveVariables)
    const target = matched ? node.then : node.else
    outcome = target
      ? { kind: 'condition', nextNodeId: target, matched }
      : { kind: 'error', message: `Node "${nodeId}": condition evaluated to ${matched} but no matching target is defined.` }
  } else if (node.actions?.length) {
    outcome = { kind: 'await-actions', actions: deepInterpolate(node.actions, effectiveVariables) }
  } else if (node.next) {
    outcome = { kind: 'auto-transition', nextNodeId: node.next }
  } else if (!node.end && nodeHasInteractiveContent(node)) {
    outcome = { kind: 'idle' }
  } else {
    outcome = { kind: 'terminal' }
  }

  return { nodeId, setVariables: node.set, steps, outcome }
}

function userTextMessage(nodeId: string, text: string): NormalizedMessage {
  return {
    runtimeId: createId('msg'),
    nodeId,
    timestamp: Date.now(),
    message: { type: 'text', sender: 'user', text },
  }
}

/** Resolves a plain `Choice` (node actions, suggested replies, seat pickers…). */
export function resolveChoice(choice: Choice, nodeId: string): InteractionResult {
  return {
    userMessage: userTextMessage(nodeId, choice.label),
    setVariables: choice.set,
    nextNodeId: choice.next,
  }
}

/** Resolves a `list` row selection. */
export function resolveListRow(row: ListRow, nodeId: string): InteractionResult {
  return {
    userMessage: userTextMessage(nodeId, row.title),
    setVariables: row.set,
    nextNodeId: row.next,
  }
}

/** Resolves a rich `Action` (suggested actions, card/boarding-pass buttons). */
export function resolveAction(action: Action, nodeId: string): InteractionResult {
  if (action.type === 'reply') {
    return {
      userMessage: userTextMessage(nodeId, action.label),
      setVariables: action.set,
      nextNodeId: action.next,
    }
  }
  return { externalAction: action }
}

export interface BoardingPassInteractionResult extends InteractionResult {
  sideEffect?: 'download' | 'add_to_wallet' | 'view'
}

/** Resolves a boarding-pass button (download / add to wallet / view / reply). */
export function resolveBoardingPassAction(
  action: BoardingPassAction,
  nodeId: string,
): BoardingPassInteractionResult {
  if (action.type === 'reply') {
    return {
      userMessage: userTextMessage(nodeId, action.label),
      setVariables: action.set,
      nextNodeId: action.next,
    }
  }
  return { sideEffect: action.type, nextNodeId: 'next' in action ? action.next : undefined }
}

/** Resolves a free-text `input` submission. */
export function resolveInputSubmission(
  nodeId: string,
  variableName: string,
  next: string | undefined,
  value: string,
): InteractionResult {
  return {
    userMessage: userTextMessage(nodeId, value),
    setVariables: { [variableName]: value },
    nextNodeId: next,
  }
}
