import { flowDefinitionSchema, type FlowDefinition } from '../schema/flow'
import { nodeHasInteractiveContent } from './ConversationEngine'

export interface ValidationIssue {
  nodeId?: string
  message: string
}

export type FlowValidationResult =
  | { success: true; flow: FlowDefinition; warnings: ValidationIssue[] }
  | { success: false; errors: ValidationIssue[] }

/**
 * Validates a raw parsed value (from JSON/YAML) as a flow definition:
 * 1. Zod schema validation (types/shape).
 * 2. Structural checks: duplicate node ids, valid start node, and every
 *    `next`/`then`/`else`/action/reply/list-row/input reference resolving to
 *    an existing node id.
 *
 * Never throws — malformed input always yields a `{ success: false }` result
 * with human-readable messages so the simulator never crashes on bad input.
 */
export function validateFlow(raw: unknown): FlowValidationResult {
  const parsed = flowDefinitionSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.')
      return { message: path ? `${path}: ${issue.message}` : issue.message }
    })
    return { success: false, errors }
  }

  const flow = parsed.data
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  const idCounts = new Map<string, number>()
  for (const node of flow.nodes) {
    idCounts.set(node.id, (idCounts.get(node.id) ?? 0) + 1)
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({ nodeId: id, message: `Duplicate node id "${id}" appears ${count} times.` })
    }
  }

  const nodeIds = new Set(flow.nodes.map((node) => node.id))
  if (!nodeIds.has(flow.start)) {
    errors.push({ message: `Start node "${flow.start}" does not exist.` })
  }

  const checkRef = (nodeId: string, target: string | undefined, label: string) => {
    if (target && !nodeIds.has(target)) {
      errors.push({
        nodeId,
        message: `Node "${nodeId}": ${label} target node "${target}" does not exist.`,
      })
    }
  }

  for (const node of flow.nodes) {
    checkRef(node.id, node.next, '"next"')
    checkRef(node.id, node.then, '"then"')
    checkRef(node.id, node.else, '"else"')

    for (const action of node.actions ?? []) {
      checkRef(node.id, action.next, `action "${action.label}"`)
    }

    for (const message of node.messages ?? []) {
      if (message.type === 'suggested_replies') {
        for (const option of message.options) {
          checkRef(node.id, option.next, `reply "${option.label}"`)
        }
      }
      if (message.type === 'list') {
        for (const section of message.sections) {
          for (const row of section.rows) {
            checkRef(node.id, row.next, `list row "${row.title}"`)
          }
        }
      }
      if (message.type === 'input') {
        checkRef(node.id, message.next, 'input')
      }
      if (message.type === 'carousel') {
        for (const card of message.cards) {
          for (const action of card.actions ?? []) {
            if (action.type === 'reply') {
              checkRef(node.id, action.next, `carousel card "${card.title}" action "${action.label}"`)
            }
          }
        }
      }
      if ('actions' in message && Array.isArray(message.actions)) {
        for (const action of message.actions) {
          if (action.type === 'reply' || action.type === 'download' || action.type === 'add_to_wallet') {
            checkRef(node.id, action.next, `action "${action.label}"`)
          }
        }
      }
    }

    if (node.condition && !node.then) {
      errors.push({ nodeId: node.id, message: `Node "${node.id}": has a "condition" but no "then" target.` })
    }

    const hasOutcome = Boolean(
      node.actions?.length || node.condition || node.next || node.end || nodeHasInteractiveContent(node),
    )
    if (!hasOutcome) {
      warnings.push({
        nodeId: node.id,
        message: `Node "${node.id}" has no actions, condition, or "next" — the scenario will end here.`,
      })
    }
  }

  if (errors.length > 0) return { success: false, errors }
  return { success: true, flow, warnings }
}
