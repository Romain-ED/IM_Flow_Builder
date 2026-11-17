import type { AnchoredEdge } from '../../engine/flowGraph'
import { NODE_ANCHOR } from '../../engine/flowAnchors'
import type { Point } from '../../engine/flowChartLayout'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface ConnectorGeometry {
  key: string
  kind: AnchoredEdge['kind']
  /** SVG path data. The arrowhead is drawn at the last point. */
  d: string
  label?: string
  labelX: number
  labelY: number
}

/** Id used for an edge in the elk layout. Index in the edge list keeps it unique and stable. */
export function edgeId(index: number): string {
  return `e${index}`
}

export function polylinePath(points: Point[]): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

/** The point halfway along a polyline, measured by length. */
export function polylineMidpoint(points: Point[]): Point {
  const segments = points.slice(1).map((point, i) => ({ from: points[i], to: point }))
  const length = (segment: { from: Point; to: Point }) => Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y)
  let remaining = segments.reduce((total, segment) => total + length(segment), 0) / 2
  for (const segment of segments) {
    const size = length(segment)
    if (size > 0 && size >= remaining) {
      const t = remaining / size
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * t,
        y: segment.from.y + (segment.to.y - segment.from.y) * t,
      }
    }
    remaining -= size
  }
  return points[points.length - 1] ?? { x: 0, y: 0 }
}

/**
 * Turns the elk route for every edge into the drawn arrow. A button edge starts
 * at the right-middle of its button and runs straight to its port on the node
 * edge. A node-level edge starts at its node's port. Edges without a route or a
 * placed source are skipped.
 *
 * @param edges Edges in the same order they were given to the layout.
 * @param routes Route per `edgeId(index)` from the layout, in absolute chart coordinates.
 * @param placed Absolute box of each placed node.
 * @param anchorsByNode Box of each button, relative to its node's top-left.
 */
export function buildConnectorGeometry(
  edges: AnchoredEdge[],
  routes: Record<string, Point[]>,
  placed: Map<string, Box>,
  anchorsByNode: Record<string, Record<string, Box>>,
): ConnectorGeometry[] {
  const geometry: ConnectorGeometry[] = []
  edges.forEach((edge, index) => {
    const id = edgeId(index)
    const route = routes[id]
    const source = placed.get(edge.from)
    if (!route || route.length === 0 || !source) return

    const anchorBox = edge.anchor === NODE_ANCHOR ? undefined : anchorsByNode[edge.from]?.[edge.anchor]
    const points = anchorBox
      ? [{ x: source.x + anchorBox.x + anchorBox.width, y: source.y + anchorBox.y + anchorBox.height / 2 }, ...route]
      : route
    const middle = polylineMidpoint(points)
    geometry.push({
      key: `${id}:${edge.from}:${edge.anchor}:${edge.to}`,
      kind: edge.kind,
      d: polylinePath(points),
      label: edge.label,
      labelX: middle.x,
      labelY: middle.y,
    })
  })
  return geometry
}
