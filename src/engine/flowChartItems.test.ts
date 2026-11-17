import { describe, expect, it } from 'vitest'
import type { FlowNode } from '../schema/flow'
import { CHART_BUBBLE_WIDTH, buildChartNodeItems } from './flowChartItems'

function node(partial: Partial<FlowNode> & { id: string }): FlowNode {
  return partial as FlowNode
}

const replies = {
  type: 'suggested_replies',
  options: [{ label: 'Yes', next: 'a' }, { label: 'No', next: 'b' }],
}

describe('buildChartNodeItems', () => {
  it('keeps suggestion chips as their own bubble on RCS', () => {
    const items = buildChartNodeItems(
      node({ id: 'ask', messages: [{ type: 'text', text: 'Proceed?' }, replies] as FlowNode['messages'] }),
      false,
    )

    expect(items.bubbles.map((bubble) => bubble.message.message.type)).toEqual(['text', 'suggested_replies'])
    expect(items.bubbles[0].attached).toEqual([])
    expect(items.floating).toEqual([])
  })

  it('attaches suggestion chips under the text bubble on WhatsApp, with message-index anchors', () => {
    const items = buildChartNodeItems(
      node({ id: 'ask', messages: [{ type: 'text', text: 'Proceed?' }, replies] as FlowNode['messages'] }),
      true,
    )

    expect(items.bubbles).toHaveLength(1)
    expect(items.bubbles[0].attached).toEqual([
      { anchor: 'message-1-option-0', label: 'Yes' },
      { anchor: 'message-1-option-1', label: 'No' },
    ])
  })

  it('skips delay and typing pseudo-messages but keeps authored indexes for anchors', () => {
    const items = buildChartNodeItems(
      node({
        id: 'ask',
        messages: [{ type: 'typing', durationMs: 500 }, { type: 'text', text: 'Hi' }, replies] as unknown as FlowNode['messages'],
      }),
      false,
    )

    expect(items.bubbles.map((bubble) => bubble.message.runtimeId)).toEqual(['ask:1', 'ask:2'])
  })

  it('shows node-level buttons as a floating row on RCS', () => {
    const items = buildChartNodeItems(
      node({ id: 'end', messages: [{ type: 'text', text: 'Done' }] as FlowNode['messages'], actions: [{ label: 'Back' }] }),
      false,
    )

    expect(items.floating).toEqual([{ anchor: 'node-action-0', label: 'Back' }])
    expect(items.bubbles[0].attached).toEqual([])
  })

  it('attaches node-level buttons to a trailing business text on WhatsApp', () => {
    const items = buildChartNodeItems(
      node({ id: 'end', messages: [{ type: 'text', text: 'Done' }] as FlowNode['messages'], actions: [{ label: 'Back' }] }),
      true,
    )

    expect(items.bubbles[0].attached).toEqual([{ anchor: 'node-action-0', label: 'Back' }])
    expect(items.floating).toEqual([])
  })

  it('floats node-level buttons on WhatsApp when the last bubble is not text', () => {
    const items = buildChartNodeItems(
      node({
        id: 'card',
        messages: [{ type: 'rich_card', title: 'Offer' }] as unknown as FlowNode['messages'],
        actions: [{ label: 'Accept' }],
      }),
      true,
    )

    expect(items.floating).toEqual([{ anchor: 'node-action-0', label: 'Accept' }])
  })

  it('returns no bubbles for an empty node', () => {
    const items = buildChartNodeItems(node({ id: 'empty' }), false)

    expect(items).toEqual({ nodeId: 'empty', bubbles: [], floating: [], contentWidth: CHART_BUBBLE_WIDTH })
  })
})
