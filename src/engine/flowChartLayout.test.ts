import { describe, expect, it } from 'vitest'
import { layoutFlowChart, type LayoutEdge, type LayoutNode } from './flowChartLayout'

const port = (node: string, anchor: string, y: number) => ({ id: `${node}::out::${anchor}`, y })

const branching: LayoutNode[] = [
  { id: 'start', width: 200, height: 160, ports: [port('start', 'a', 40), port('start', 'b', 120)] },
  { id: 'left', width: 200, height: 90, ports: [] },
  { id: 'right', width: 200, height: 200, ports: [port('right', 'c', 60)] },
  { id: 'end', width: 200, height: 70, ports: [] },
]
const branchingEdges: LayoutEdge[] = [
  { id: 'e1', fromPort: 'start::out::a', to: 'left' },
  { id: 'e2', fromPort: 'start::out::b', to: 'right' },
  { id: 'e3', fromPort: 'right::out::c', to: 'end' },
  { id: 'e4', fromPort: 'right::out::c', to: 'start' },
]

describe('layoutFlowChart', () => {
  it('starts each edge at the row of its button and ends at the target left edge', async () => {
    const layout = await layoutFlowChart(branching, branchingEdges)
    const sourceOf = (id: string) => branching.find((node) => node.id === id)!
    const start = layout.nodes.start
    const target = layout.nodes.left
    const route = layout.edges.e1

    expect(route[0]).toEqual({ x: start.x + sourceOf('start').width, y: start.y + 40 })
    expect(route[route.length - 1]).toEqual({ x: target.x, y: target.y + 45 })
  })

  it('places no two nodes on top of each other', async () => {
    const layout = await layoutFlowChart(branching, branchingEdges)
    const boxes = branching.map((node) => ({ ...layout.nodes[node.id], width: node.width, height: node.height }))

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
        expect(overlaps, `${boxes[i]} overlaps ${boxes[j]}`).toBe(false)
      }
    }
  })

  it('keeps every node inside the reported canvas size', async () => {
    const layout = await layoutFlowChart(branching, branchingEdges)

    for (const node of branching) {
      const at = layout.nodes[node.id]
      expect(at.x + node.width).toBeLessThanOrEqual(layout.width)
      expect(at.y + node.height).toBeLessThanOrEqual(layout.height)
    }
  })

  it('keeps the start node in the leftmost column when the flow loops back to it', async () => {
    const loop: LayoutNode[] = [
      { id: 'start', width: 200, height: 80, ports: [port('start', 'node', 40)] },
      { id: 'middle', width: 200, height: 80, ports: [port('middle', 'a', 40)] },
      { id: 'last', width: 200, height: 80, ports: [port('last', 'back', 40)] },
    ]
    const loopEdges: LayoutEdge[] = [
      { id: 'e1', fromPort: 'start::out::node', to: 'middle' },
      { id: 'e2', fromPort: 'middle::out::a', to: 'last' },
      { id: 'e3', fromPort: 'last::out::back', to: 'start' },
    ]
    const layout = await layoutFlowChart(loop, loopEdges)

    expect(layout.nodes.start.x).toBeLessThan(layout.nodes.middle.x)
    expect(layout.nodes.middle.x).toBeLessThan(layout.nodes.last.x)
  })

  it('gives the same layout for the same input', async () => {
    const first = await layoutFlowChart(branching, branchingEdges)
    const second = await layoutFlowChart(branching, branchingEdges)

    expect(second).toEqual(first)
  })
})
