import ELK, { type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js'

export interface Point {
  x: number
  y: number
}

/** A button's out port, placed at its vertical center on the node's right edge. */
export interface LayoutPort {
  id: string
  /** Vertical center of the button, relative to the node's top edge. */
  y: number
}

export interface LayoutNode {
  id: string
  width: number
  height: number
  ports: LayoutPort[]
}

export interface LayoutEdge {
  id: string
  /** Id of the out port the edge leaves from. */
  fromPort: string
  to: string
}

export interface FlowChartLayout {
  /** Top-left corner of each node. */
  nodes: Record<string, Point>
  /** Route for each edge, from its out port to the target's left edge. */
  edges: Record<string, Point[]>
  width: number
  height: number
}

const PADDING = 32
const inPortId = (nodeId: string) => `${nodeId}::in`

let elk: InstanceType<typeof ELK> | null = null

function elkInstance(): InstanceType<typeof ELK> {
  elk ??= new ELK()
  return elk
}

/**
 * Lays out the flow with elkjs. Every button is a fixed port, so each edge leaves
 * from the row of the button that causes it. Every node has one input port on its
 * left edge. Layout is deterministic for the same input order.
 */
export async function layoutFlowChart(nodes: LayoutNode[], edges: LayoutEdge[]): Promise<FlowChartLayout> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '40',
      'elk.spacing.edgeNode': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': '96',
      // Flows loop back to earlier steps. Walking from the first node keeps the start on the left.
      'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
      'elk.padding': `[top=${PADDING},left=${PADDING},bottom=${PADDING},right=${PADDING}]`,
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
      ports: [
        { id: inPortId(node.id), x: 0, y: node.height / 2, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'WEST' } },
        ...node.ports.map((port) => ({
          id: port.id,
          x: node.width,
          y: port.y,
          width: 0,
          height: 0,
          layoutOptions: { 'elk.port.side': 'EAST' },
        })),
      ],
    })),
    edges: edges.map((edge): ElkExtendedEdge => ({
      id: edge.id,
      sources: [edge.fromPort],
      targets: [inPortId(edge.to)],
    })),
  }

  const laidOut = await elkInstance().layout(graph)

  const nodePositions: Record<string, Point> = {}
  for (const child of laidOut.children ?? []) {
    nodePositions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 }
  }

  const routes: Record<string, Point[]> = {}
  for (const edge of (laidOut.edges ?? []) as ElkExtendedEdge[]) {
    const section = edge.sections?.[0]
    if (!section) continue
    routes[edge.id] = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
  }

  return {
    nodes: nodePositions,
    edges: routes,
    width: laidOut.width ?? 0,
    height: laidOut.height ?? 0,
  }
}
