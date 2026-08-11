import { describe, it, expect } from 'vitest'
import type { FlowDefinition } from '../schema/flow'
import { computeFlowGraphLayout, outgoingEdges } from './flowGraph'

function flow(nodes: FlowDefinition['nodes'], start = nodes[0].id): FlowDefinition {
  return {
    version: '1.0',
    metadata: { id: 'test', name: 'Test' },
    brand: { name: 'Test Brand' },
    start,
    nodes,
  }
}

describe('outgoingEdges', () => {
  it('collects next, actions, and condition then/else', () => {
    const edges = outgoingEdges({
      id: 'a',
      next: 'b',
      actions: [{ label: 'Go', next: 'c' }],
      condition: { variable: 'x', operator: 'exists' },
      then: 'd',
      else: 'e',
    })
    const targets = edges.map((e) => e.to).sort()
    expect(targets).toEqual(['b', 'c', 'd', 'e'])
  })

  it('collects targets from suggested_replies and list rows', () => {
    const edges = outgoingEdges({
      id: 'a',
      messages: [
        { type: 'suggested_replies', sender: 'business', options: [{ label: 'X', next: 'x' }] },
        {
          type: 'list',
          sender: 'business',
          title: 'T',
          buttonLabel: 'B',
          sections: [{ rows: [{ id: 'r', title: 'R', next: 'y' }] }],
        },
      ],
    })
    expect(edges.map((e) => e.to).sort()).toEqual(['x', 'y'])
  })

  it('deduplicates repeated targets', () => {
    const edges = outgoingEdges({
      id: 'a',
      actions: [
        { label: 'One', next: 'b' },
        { label: 'Two', next: 'b' },
      ],
    })
    expect(edges).toHaveLength(1)
  })
})

describe('computeFlowGraphLayout', () => {
  it('places the start node in column 0', () => {
    const layout = computeFlowGraphLayout(
      flow([
        { id: 'a', next: 'b' },
        { id: 'b', end: true },
      ]),
    )
    const a = layout.nodes.find((n) => n.id === 'a')
    expect(a?.column).toBe(0)
    expect(a?.isStart).toBe(true)
  })

  it('assigns column by shortest distance from start', () => {
    const layout = computeFlowGraphLayout(
      flow([
        { id: 'a', actions: [{ label: 'Go', next: 'b' }] },
        { id: 'b', actions: [{ label: 'Go', next: 'c' }] },
        { id: 'c', end: true },
      ]),
    )
    const columns = Object.fromEntries(layout.nodes.map((n) => [n.id, n.column]))
    expect(columns).toEqual({ a: 0, b: 1, c: 2 })
  })

  it('places unreachable nodes in a trailing column, never dropping them', () => {
    const layout = computeFlowGraphLayout(
      flow([
        { id: 'a', end: true },
        { id: 'orphan', end: true },
      ]),
    )
    expect(layout.nodes).toHaveLength(2)
    const orphan = layout.nodes.find((n) => n.id === 'orphan')
    expect(orphan?.kind).toBe('unreached')
    expect(orphan?.column).toBeGreaterThan(0)
  })

  it('classifies condition and terminal nodes', () => {
    const layout = computeFlowGraphLayout(
      flow([
        { id: 'a', condition: { variable: 'x', operator: 'exists' }, then: 'b', else: 'c' },
        { id: 'b', end: true },
        { id: 'c', end: true },
      ]),
    )
    const kinds = Object.fromEntries(layout.nodes.map((n) => [n.id, n.kind]))
    expect(kinds).toEqual({ a: 'condition', b: 'terminal', c: 'terminal' })
    // The start node keeps its real kind (condition) — "start" is a separate flag, not a kind that masks it.
    expect(layout.nodes.find((n) => n.id === 'a')?.isStart).toBe(true)
  })

  it('produces no duplicate nodes even with cycles', () => {
    const layout = computeFlowGraphLayout(
      flow([
        { id: 'a', next: 'b' },
        { id: 'b', next: 'a' },
      ]),
    )
    expect(layout.nodes).toHaveLength(2)
  })
})
