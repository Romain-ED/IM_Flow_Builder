import type { FlowDefinition, FlowNode } from '../schema/flow'
import {
  NODE_ANCHOR,
  actionAnchor,
  cardActionAnchor,
  nodeActionAnchor,
  optionAnchor,
  rowAnchor,
} from './flowAnchors'

export type GraphNodeKind = 'condition' | 'terminal' | 'normal' | 'unreached'

export interface GraphNode {
  id: string
  label: string
  kind: GraphNodeKind
  isStart: boolean
  column: number
  row: number
  x: number
  y: number
}

export interface GraphEdge {
  from: string
  to: string
  kind: 'condition-then' | 'condition-else' | 'flow'
}

export interface AnchoredEdge extends GraphEdge {
  /** The button that causes this transition, or `NODE_ANCHOR` when no button does. */
  anchor: string
  /** Text of the button, when a button causes the transition. */
  label?: string
}

export interface FlowGraphLayout {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

export const GRAPH_NODE_WIDTH = 168
export const GRAPH_NODE_HEIGHT = 56
const COLUMN_SPACING = 224
const ROW_SPACING = 78
const MARGIN = 24

/**
 * Every transition a node can make, with the button that causes it. Each button
 * gets its own entry, even when two buttons lead to the same node. Node-level
 * transitions (next, free text, condition branches) share `NODE_ANCHOR` and
 * are deduplicated.
 */
export function anchoredEdges(node: FlowNode): AnchoredEdge[] {
  const edges: AnchoredEdge[] = []
  const seenNodeLevel = new Set<string>()
  const add = (to: string | undefined, kind: GraphEdge['kind'], anchor: string, label?: string) => {
    if (!to) return
    if (anchor === NODE_ANCHOR) {
      if (seenNodeLevel.has(`${kind}:${to}`)) return
      seenNodeLevel.add(`${kind}:${to}`)
    }
    edges.push({ from: node.id, to, kind, anchor, label })
  }

  if (node.condition) {
    add(node.then, 'condition-then', NODE_ANCHOR, 'then')
    add(node.else, 'condition-else', NODE_ANCHOR, 'else')
  }
  add(node.next, 'flow', NODE_ANCHOR)
  add(node.freeTextNext, 'flow', NODE_ANCHOR)
  const nodeActions = node.actions ?? []
  nodeActions.forEach((choice, j) => add(choice.next, 'flow', nodeActionAnchor(j), choice.label))

  const authored = node.messages ?? []
  authored.forEach((message, i) => {
    switch (message.type) {
      case 'suggested_replies':
        message.options.forEach((option, j) => add(option.next, 'flow', optionAnchor(i, j), option.label))
        break
      case 'list': {
        let rowIndex = 0
        for (const section of message.sections) {
          for (const row of section.rows) {
            add(row.next, 'flow', rowAnchor(i, rowIndex), row.title)
            rowIndex += 1
          }
        }
        break
      }
      case 'input':
      case 'otp':
      case 'payment_request':
      case 'calendar_event':
      case 'whatsapp_flow':
        add(message.next, 'flow', NODE_ANCHOR)
        break
      case 'carousel':
        message.cards.forEach((card, c) => {
          const cardActions = card.actions ?? []
          cardActions.forEach((action, j) => {
            if (action.type === 'reply') add(action.next, 'flow', cardActionAnchor(i, c, j), action.label)
          })
        })
        break
      default:
        if ('actions' in message && Array.isArray(message.actions)) {
          message.actions.forEach((action, j) => {
            if (action.type === 'reply' || action.type === 'download' || action.type === 'add_to_wallet') {
              add(action.next, 'flow', actionAnchor(i, j), action.label)
            }
          })
        }
    }
  })

  return edges
}

/** Every node id a given node can transition to, deduplicated, in a stable order. */
export function outgoingEdges(node: FlowNode): GraphEdge[] {
  const seen = new Set<string>()
  const edges: GraphEdge[] = []
  for (const { from, to, kind } of anchoredEdges(node)) {
    if (seen.has(`${kind}:${to}`)) continue
    seen.add(`${kind}:${to}`)
    edges.push({ from, to, kind })
  }
  return edges
}

function classifyNode(node: FlowNode): GraphNodeKind {
  if (node.condition) return 'condition'
  if (node.end) return 'terminal'
  return 'normal'
}

/**
 * Pure layout computation: BFS from `start` following every reachable edge,
 * assigning each node a column (its shortest distance from start) and a row
 * (discovery order within that column). Nodes unreachable from `start` are
 * placed in one trailing "unreached" column so nothing from the flow is
 * ever silently omitted from the view.
 */
export function computeFlowGraphLayout(flow: FlowDefinition): FlowGraphLayout {
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  const edgesByNode = new Map(flow.nodes.map((n) => [n.id, outgoingEdges(n)]))

  const columnOf = new Map<string, number>()
  const order: string[] = []
  if (byId.has(flow.start)) {
    columnOf.set(flow.start, 0)
    order.push(flow.start)
    let queue = [flow.start]
    while (queue.length > 0) {
      const next: string[] = []
      for (const id of queue) {
        for (const edge of edgesByNode.get(id) ?? []) {
          if (!columnOf.has(edge.to) && byId.has(edge.to)) {
            columnOf.set(edge.to, (columnOf.get(id) ?? 0) + 1)
            order.push(edge.to)
            next.push(edge.to)
          }
        }
      }
      queue = next
    }
  }

  const unreached = flow.nodes.map((n) => n.id).filter((id) => !columnOf.has(id))
  const unreachedColumn = unreached.length > 0 ? Math.max(0, ...Array.from(columnOf.values())) + 2 : 0
  for (const id of unreached) columnOf.set(id, unreachedColumn)

  const unreachedSet = new Set(unreached)
  const rowCounters = new Map<number, number>()
  const nodes: GraphNode[] = [...order, ...unreached].map((id) => {
    const node = byId.get(id)
    const column = columnOf.get(id) ?? 0
    const row = rowCounters.get(column) ?? 0
    rowCounters.set(column, row + 1)
    const kind: GraphNodeKind = unreachedSet.has(id) ? 'unreached' : node ? classifyNode(node) : 'normal'
    return {
      id,
      label: node?.label ?? '',
      kind,
      isStart: id === flow.start,
      column,
      row,
      x: MARGIN + column * COLUMN_SPACING,
      y: MARGIN + row * ROW_SPACING,
    }
  })

  const edges: GraphEdge[] = flow.nodes.flatMap((n) => (edgesByNode.get(n.id) ?? []).filter((e) => byId.has(e.to)))

  const maxColumn = Math.max(0, ...nodes.map((n) => n.column))
  const maxRow = Math.max(0, ...Array.from(rowCounters.values()).map((c) => c - 1))
  const width = MARGIN * 2 + (maxColumn + 1) * COLUMN_SPACING
  const height = MARGIN * 2 + (maxRow + 1) * ROW_SPACING

  return { nodes, edges, width, height }
}
