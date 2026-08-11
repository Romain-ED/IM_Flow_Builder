import type { Action, Choice, Message, RenderableMessage, VariableMap } from '../schema/messages'

/** A message after variable interpolation, with a stable id/timestamp assigned. */
export interface NormalizedMessage {
  runtimeId: string
  nodeId: string
  timestamp: number
  message: RenderableMessage
}

export type PlayStep =
  | { kind: 'typing'; durationMs: number }
  | { kind: 'wait'; durationMs: number }
  | { kind: 'message'; message: NormalizedMessage }

/**
 * What happens once a node's messages have finished playing. Note this only
 * governs the persistent bottom action bar (`node.actions`) — inline
 * interactive messages (suggested_replies/list/input) stay individually
 * tappable for as long as they belong to the current node, independent of
 * this outcome (see `isMessageInteractive`).
 */
export type NodeOutcome =
  | { kind: 'await-actions'; actions: Choice[] }
  | { kind: 'auto-transition'; nextNodeId: string }
  | { kind: 'condition'; nextNodeId: string; matched: boolean }
  | { kind: 'terminal' }
  /** No bottom action bar and no auto-transition, but the node's messages still contain live interactive content (e.g. a boarding pass or carousel). */
  | { kind: 'idle' }
  | { kind: 'error'; message: string }

export interface NodePlan {
  nodeId: string
  setVariables?: VariableMap
  steps: PlayStep[]
  outcome: NodeOutcome
}

/** The result of a user resolving an interaction (button/reply/row/input). */
export interface InteractionResult {
  userMessage?: NormalizedMessage
  setVariables?: VariableMap
  nextNodeId?: string
  externalAction?: Action
}

export type { Message }
