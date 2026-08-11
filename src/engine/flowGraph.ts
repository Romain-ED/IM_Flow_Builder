import type { FlowDefinition, FlowNode } from '../schema/flow'

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

/** Every node id a given node can transition to, deduplicated, in a stable order. */
export function outgoingEdges(node: FlowNode): GraphEdge[] {
  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  const add = (to: string | undefined, kind: GraphEdge['kind']) => {
    if (!to || seen.has(`${kind}:${to}`)) return
    seen.add(`${kind}:${to}`)
    edges.push({ from: node.id, to, kind })
  }

  if (node.condition) {
    add(node.then, 'condition-then')
    add(node.else, 'condition-else')
  }
  add(node.next, 'flow')
  for (const action of node.actions ?? []) add(action.next, 'flow')

  for (const message of node.messages ?? []) {
    switch (message.type) {
      case 'suggested_replies':
        for (const option of message.options) add(option.next, 'flow')
        break
      case 'list':
        for (const section of message.sections) {
          for (const row of section.rows) add(row.next, 'flow')
        }
        break
      case 'input':
      case 'otp':
      case 'payment_request':
      case 'calendar_event':
      case 'whatsapp_flow':
        add(message.next, 'flow')
        break
      case 'carousel':
        for (const card of message.cards) {
          for (const action of card.actions ?? []) {
            if (action.type === 'reply') add(action.next, 'flow')
          }
        }
        break
      default:
        if ('actions' in message && Array.isArray(message.actions)) {
          for (const action of message.actions) {
            if (action.type === 'reply' || action.type === 'download' || action.type === 'add_to_wallet') {
              add(action.next, 'flow')
            }
          }
        }
    }
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
