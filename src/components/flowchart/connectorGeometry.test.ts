import { describe, expect, it } from 'vitest'
import type { AnchoredEdge } from '../../engine/flowGraph'
import { buildConnectorGeometry, edgeId, polylineMidpoint, polylinePath } from './connectorGeometry'

const placed = new Map([
  ['a', { x: 100, y: 50, width: 200, height: 160 }],
  ['b', { x: 500, y: 50, width: 200, height: 90 }],
])
const anchorsByNode = { a: { button: { x: 10, y: 20, width: 60, height: 20 } } }

describe('polylinePath', () => {
  it('joins points with straight segments', () => {
    expect(polylinePath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])).toBe('M 0 0 L 10 0 L 10 10')
  })
})

describe('polylineMidpoint', () => {
  it('returns the point halfway along the total length', () => {
    expect(polylineMidpoint([{ x: 0, y: 0 }, { x: 20, y: 0 }])).toEqual({ x: 10, y: 0 })
    expect(polylineMidpoint([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])).toEqual({ x: 10, y: 0 })
  })
})

describe('buildConnectorGeometry', () => {
  it('starts a button edge at the right-middle of the button, then runs to the elk port', () => {
    const edges: AnchoredEdge[] = [{ from: 'a', to: 'b', kind: 'flow', anchor: 'button', label: 'Go' }]
    // Port sits at the button's vertical center: node y 50 + 30 = 80, on the node's right edge at x = 300.
    const routes = { [edgeId(0)]: [{ x: 300, y: 80 }, { x: 400, y: 80 }, { x: 400, y: 95 }, { x: 500, y: 95 }] }
    const [connector] = buildConnectorGeometry(edges, routes, placed, anchorsByNode)

    expect(connector.d.startsWith('M 170 80 L 300 80 L 400 80')).toBe(true)
    expect(connector.label).toBe('Go')
  })

  it('starts a node-level edge at the elk port with no button segment', () => {
    const edges: AnchoredEdge[] = [{ from: 'a', to: 'b', kind: 'flow', anchor: 'node' }]
    const routes = { [edgeId(0)]: [{ x: 300, y: 130 }, { x: 500, y: 95 }] }
    const [connector] = buildConnectorGeometry(edges, routes, placed, anchorsByNode)

    expect(connector.d).toBe('M 300 130 L 500 95')
    expect(connector.label).toBeUndefined()
  })

  it('falls back to the node-level start when a button has no measured box', () => {
    const edges: AnchoredEdge[] = [{ from: 'a', to: 'b', kind: 'flow', anchor: 'missing', label: 'Lost' }]
    const routes = { [edgeId(0)]: [{ x: 300, y: 130 }, { x: 500, y: 95 }] }
    const [connector] = buildConnectorGeometry(edges, routes, placed, anchorsByNode)

    expect(connector.d.startsWith('M 300 130 ')).toBe(true)
  })

  it('skips edges that have no route or no placed source', () => {
    const edges: AnchoredEdge[] = [
      { from: 'a', to: 'b', kind: 'flow', anchor: 'node' },
      { from: 'gone', to: 'b', kind: 'flow', anchor: 'node' },
    ]
    const routes = { [edgeId(1)]: [{ x: 0, y: 0 }, { x: 5, y: 5 }] }

    expect(buildConnectorGeometry(edges, routes, placed, anchorsByNode)).toEqual([])
  })

  it('gives each edge its own key, even for repeated targets', () => {
    const edges: AnchoredEdge[] = [
      { from: 'a', to: 'b', kind: 'flow', anchor: 'button', label: 'One' },
      { from: 'a', to: 'b', kind: 'flow', anchor: 'node' },
    ]
    const routes = {
      [edgeId(0)]: [{ x: 300, y: 80 }, { x: 500, y: 95 }],
      [edgeId(1)]: [{ x: 300, y: 130 }, { x: 500, y: 95 }],
    }
    const keys = buildConnectorGeometry(edges, routes, placed, anchorsByNode).map((connector) => connector.key)

    expect(new Set(keys).size).toBe(2)
  })
})
