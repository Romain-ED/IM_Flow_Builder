import type { Action } from '../schema/messages'
import type { NormalizedMessage } from './types'

export type ConversationEvent =
  | { type: 'message_rendered'; at: number; nodeId: string; message: NormalizedMessage }
  | { type: 'user_action'; at: number; nodeId: string; label: string; value?: string }
  | { type: 'variable_changed'; at: number; variable: string; previousValue: unknown; newValue: unknown }
  | { type: 'node_transition'; at: number; from: string; to: string }
  | { type: 'external_action'; at: number; action: Action }
  | { type: 'scenario_restarted'; at: number }
  | { type: 'scenario_ended'; at: number; nodeId: string }

export function diffVariableEvents(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  at: number,
): ConversationEvent[] {
  const events: ConversationEvent[] = []
  for (const key of Object.keys(next)) {
    if (previous[key] !== next[key]) {
      events.push({
        type: 'variable_changed',
        at,
        variable: key,
        previousValue: previous[key],
        newValue: next[key],
      })
    }
  }
  return events
}
