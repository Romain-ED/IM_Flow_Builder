import { describe, it, expect } from 'vitest'
import { flowDefinitionSchema, type FlowDefinition } from '../schema/flow'
import {
  computeNodePlan,
  resolveAction,
  resolveChoice,
  resolveInputSubmission,
  resolveListRow,
} from './ConversationEngine'

/** Builds a flow fixture, parsing it through the real schema so defaults (e.g. `sender`) are applied. */
function flowWith(nodes: unknown[], variables: Record<string, unknown> = {}): FlowDefinition {
  return flowDefinitionSchema.parse({
    version: '1.0',
    metadata: { id: 'test', name: 'Test' },
    brand: { name: 'Test Brand' },
    defaults: { messageDelayMs: 10, typingDurationMs: 10 },
    variables,
    start: (nodes[0] as { id: string }).id,
    nodes,
  })
}

describe('computeNodePlan', () => {
  it('interpolates variables into rendered messages', () => {
    const flow = flowWith(
      [{ id: 'a', messages: [{ type: 'text', text: 'Hi {{name}}' }], end: true }],
      { name: 'Romain' },
    )
    const plan = computeNodePlan(flow, 'a', flow.variables ?? {})
    const messageStep = plan.steps.find((s) => s.kind === 'message')
    expect(messageStep && messageStep.kind === 'message' && messageStep.message.message).toMatchObject({
      type: 'text',
      text: 'Hi Romain',
    })
  })

  it('produces an await-actions outcome when the node has actions', () => {
    const flow = flowWith([
      { id: 'a', messages: [{ type: 'text', text: 'Hi' }], actions: [{ label: 'Go', next: 'b' }] },
      { id: 'b', messages: [{ type: 'text', text: 'Bye' }], end: true },
    ])
    const plan = computeNodePlan(flow, 'a', {})
    expect(plan.outcome).toEqual({ kind: 'await-actions', actions: [{ label: 'Go', next: 'b' }] })
  })

  it('produces an auto-transition outcome when the node has "next"', () => {
    const flow = flowWith([
      { id: 'a', messages: [{ type: 'text', text: 'Hi' }], next: 'b' },
      { id: 'b', messages: [{ type: 'text', text: 'Bye' }], end: true },
    ])
    const plan = computeNodePlan(flow, 'a', {})
    expect(plan.outcome).toEqual({ kind: 'auto-transition', nextNodeId: 'b' })
  })

  it('evaluates a condition and routes to "then" when it matches', () => {
    const flow = flowWith([
      { id: 'a', condition: { variable: 'checkedIn', operator: 'equals', value: true }, then: 'b', else: 'c' },
      { id: 'b', messages: [{ type: 'text', text: 'Already in' }], end: true },
      { id: 'c', messages: [{ type: 'text', text: 'Not yet' }], end: true },
    ])
    const plan = computeNodePlan(flow, 'a', { checkedIn: true })
    expect(plan.outcome).toEqual({ kind: 'condition', nextNodeId: 'b', matched: true })
  })

  it('evaluates a condition and routes to "else" when it does not match', () => {
    const flow = flowWith([
      { id: 'a', condition: { variable: 'checkedIn', operator: 'equals', value: true }, then: 'b', else: 'c' },
      { id: 'b', messages: [{ type: 'text', text: 'Already in' }], end: true },
      { id: 'c', messages: [{ type: 'text', text: 'Not yet' }], end: true },
    ])
    const plan = computeNodePlan(flow, 'a', { checkedIn: false })
    expect(plan.outcome).toEqual({ kind: 'condition', nextNodeId: 'c', matched: false })
  })

  it('produces a terminal outcome for a true dead-end node', () => {
    const flow = flowWith([{ id: 'a', messages: [{ type: 'text', text: 'Bye' }], end: true }])
    const plan = computeNodePlan(flow, 'a', {})
    expect(plan.outcome).toEqual({ kind: 'terminal' })
  })

  it('produces an idle outcome (not terminal) for a node with only card-embedded actions', () => {
    const flow = flowWith([
      {
        id: 'a',
        messages: [
          {
            type: 'boarding_pass',
            passengerName: 'A',
            airline: 'A',
            flightNumber: 'A1',
            date: '1 Jan',
            origin: { code: 'AAA', city: 'A' },
            destination: { code: 'BBB', city: 'B' },
            departureTime: '10:00',
            bookingReference: 'REF1',
          },
        ],
      },
    ])
    const plan = computeNodePlan(flow, 'a', {})
    expect(plan.outcome).toEqual({ kind: 'idle' })
  })

  it('returns an error outcome for an unknown node id', () => {
    const flow = flowWith([{ id: 'a', messages: [{ type: 'text', text: 'Hi' }], end: true }])
    const plan = computeNodePlan(flow, 'missing', {})
    expect(plan.outcome.kind).toBe('error')
  })

  it('applies node-level "set" to variables used for interpolation', () => {
    const flow = flowWith([
      { id: 'a', set: { seat: '21A' }, messages: [{ type: 'text', text: 'Seat {{seat}}' }], end: true },
    ])
    const plan = computeNodePlan(flow, 'a', {})
    expect(plan.setVariables).toEqual({ seat: '21A' })
    const messageStep = plan.steps.find((s) => s.kind === 'message')
    expect(messageStep && messageStep.kind === 'message' && messageStep.message.message).toMatchObject({
      text: 'Seat 21A',
    })
  })
})

describe('interaction resolvers', () => {
  it('resolveChoice produces a user message and carries next/set through', () => {
    const result = resolveChoice({ label: 'Choose 21A', next: 'confirmed', set: { seat: '21A' } }, 'seat_selection')
    expect(result.nextNodeId).toBe('confirmed')
    expect(result.setVariables).toEqual({ seat: '21A' })
    expect(result.userMessage?.message).toMatchObject({ type: 'text', sender: 'user', text: 'Choose 21A' })
  })

  it('resolveListRow behaves like resolveChoice for list rows', () => {
    const result = resolveListRow({ id: 'seat', title: 'Choose seat', next: 'seat_selection' }, 'menu')
    expect(result.nextNodeId).toBe('seat_selection')
    expect(result.userMessage?.message).toMatchObject({ text: 'Choose seat' })
  })

  it('resolveAction with type "reply" navigates like a choice', () => {
    const result = resolveAction({ type: 'reply', label: 'Continue', next: 'next_node' }, 'a')
    expect(result.nextNodeId).toBe('next_node')
    expect(result.userMessage?.message).toMatchObject({ text: 'Continue' })
  })

  it('resolveAction with type "open_url" does not navigate and returns an externalAction', () => {
    const result = resolveAction({ type: 'open_url', label: 'Visit', url: 'https://example.com' }, 'a')
    expect(result.nextNodeId).toBeUndefined()
    expect(result.userMessage).toBeUndefined()
    expect(result.externalAction).toEqual({ type: 'open_url', label: 'Visit', url: 'https://example.com' })
  })

  it('resolveInputSubmission sets the target variable to the submitted value', () => {
    const result = resolveInputSubmission('lookup', 'bookingReference', 'lookup_result', 'ABC123')
    expect(result.setVariables).toEqual({ bookingReference: 'ABC123' })
    expect(result.nextNodeId).toBe('lookup_result')
    expect(result.userMessage?.message).toMatchObject({ text: 'ABC123' })
  })
})
