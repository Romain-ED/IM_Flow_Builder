import { describe, expect, it } from 'vitest'
import type { FlowNode } from '../schema/flow'
import { anchoredEdges, outgoingEdges } from './flowGraph'

function node(partial: Record<string, unknown> & { id: string }): FlowNode {
  return partial as unknown as FlowNode
}

describe('anchoredEdges', () => {
  const everyButton = node({
    id: 'start',
    next: 'g',
    actions: [{ label: 'Back', next: 'f' }],
    messages: [
      { type: 'text', text: 'Hi', sender: 'business' },
      {
        type: 'suggested_replies',
        options: [
          { label: 'Yes', next: 'a' },
          { label: 'No', next: 'b' },
        ],
      },
      { type: 'rich_card', title: 'Card', actions: [{ type: 'reply', label: 'Open', next: 'c' }] },
      { type: 'carousel', cards: [{ id: 'k', title: 'K', actions: [{ type: 'reply', label: 'Pick', next: 'd' }] }] },
      {
        type: 'list',
        title: 'Menu',
        buttonLabel: 'Open',
        sections: [{ rows: [{ id: 'r1', title: 'Row 1', next: 'e' }, { id: 'r2', title: 'Row 2' }] }],
      },
    ],
  })

  it('gives every button its own anchor, using the authored message index', () => {
    const edges = anchoredEdges(everyButton).map(({ anchor, to, label }) => ({ anchor, to, label }))

    expect(edges).toEqual([
      { anchor: 'node', to: 'g', label: undefined },
      { anchor: 'node-action-0', to: 'f', label: 'Back' },
      { anchor: 'message-1-option-0', to: 'a', label: 'Yes' },
      { anchor: 'message-1-option-1', to: 'b', label: 'No' },
      { anchor: 'message-2-action-0', to: 'c', label: 'Open' },
      { anchor: 'message-3-card-0-action-0', to: 'd', label: 'Pick' },
      { anchor: 'message-4-row-0', to: 'e', label: 'Row 1' },
    ])
  })

  it('keeps one entry per button when two buttons lead to the same node', () => {
    const twoButtons = node({
      id: 'x',
      messages: [
        {
          type: 'suggested_replies',
          options: [
            { label: 'Yes', next: 'done' },
            { label: 'Also yes', next: 'done' },
          ],
        },
      ],
    })

    expect(anchoredEdges(twoButtons)).toHaveLength(2)
    expect(outgoingEdges(twoButtons)).toHaveLength(1)
  })

  it('deduplicates node-level transitions that share a target', () => {
    const sameTarget = node({ id: 'x', next: 'done', freeTextNext: 'done' })

    expect(anchoredEdges(sameTarget)).toEqual([
      { from: 'x', to: 'done', kind: 'flow', anchor: 'node', label: undefined },
    ])
  })

  it('gives condition branches their own anchors and labels them then and else', () => {
    const branch = node({ id: 'check', condition: { variable: 'ok', equals: true }, then: 'yes', else: 'no' })

    expect(anchoredEdges(branch).map((edge) => [edge.kind, edge.anchor, edge.label])).toEqual([
      ['condition-then', 'condition-then', 'then'],
      ['condition-else', 'condition-else', 'else'],
    ])
  })

  it('gives the single button of OTP, payment, calendar, and WhatsApp flow steps a button anchor', () => {
    const steps = node({
      id: 'pay',
      messages: [
        { type: 'payment_request', title: 'Pay', amount: '5', next: 'paid' },
        { type: 'input', variable: 'name', next: 'after_input' },
      ],
    })

    expect(anchoredEdges(steps).map((edge) => [edge.anchor, edge.to])).toEqual([
      ['message-0-button', 'paid'],
      ['node', 'after_input'],
    ])
  })
})
