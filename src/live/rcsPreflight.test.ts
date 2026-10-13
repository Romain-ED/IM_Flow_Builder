import { describe, expect, it } from 'vitest'
import { flowDefinitionSchema } from '../schema/flow'
import { preflightLiveRcsFlow } from './rcsPreflight'

const baseFlow = flowDefinitionSchema.parse({
  version: '1',
  metadata: { id: 'live', name: 'Live', channel: 'rcs' },
  brand: { name: 'Demo' },
  start: 'start',
  nodes: [
    {
      id: 'start',
      messages: [
        { type: 'text', text: 'Hello {{name}}' },
        { type: 'suggested_replies', options: [{ label: 'Continue', next: 'end' }] },
      ],
    },
    { id: 'end', messages: [{ type: 'text', text: 'Done' }], end: true },
  ],
  variables: { name: 'Romain' },
})

describe('preflightLiveRcsFlow', () => {
  it('compiles interpolated text with stable reply correlation IDs', () => {
    const result = preflightLiveRcsFlow(baseFlow, { publicBaseUrl: 'https://demo.example' })

    expect(result).toMatchObject({ success: true, errors: [] })
    expect(result.nodes[0].content[0]).toMatchObject({
      type: 'text',
      text: 'Hello Romain',
      replies: [{ id: 'start:m:1:reply:0', label: 'Continue', next: 'end' }],
    })
  })

  it('uses 11 for trailing RCS suggestions and 4 for card-owned actions', () => {
    const flow = flowDefinitionSchema.parse({
      ...baseFlow,
      nodes: [{
        id: 'start',
        messages: [
          { type: 'text', text: 'Choose' },
          { type: 'suggested_actions', actions: Array.from({ length: 11 }, (_, i) => ({ type: 'reply', label: `Option ${i}` })) },
          { type: 'rich_card', title: 'Card', actions: Array.from({ length: 4 }, (_, i) => ({ type: 'reply', label: `Card ${i}` })) },
        ],
        end: true,
      }],
    })
    const result = preflightLiveRcsFlow(flow, { publicBaseUrl: 'https://demo.example' })
    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('resolves relative document URLs against the public base URL', () => {
    const flow = flowDefinitionSchema.parse({
      ...baseFlow,
      nodes: [{ id: 'start', messages: [{ type: 'document', filename: 'pass.pdf', url: '/assets/pass.pdf' }], end: true }],
    })
    const result = preflightLiveRcsFlow(flow, { publicBaseUrl: 'https://demo.vonage.app' })

    expect(result.success).toBe(true)
    expect(result.nodes[0].content[0]).toMatchObject({ type: 'file', url: 'https://demo.vonage.app/assets/pass.pdf' })
  })

  it('rejects simulator-only content and unsupported action variants', () => {
    const flow = flowDefinitionSchema.parse({
      ...baseFlow,
      nodes: [
        {
          id: 'start',
          messages: [
            { type: 'system_action', action: 'wallet', title: 'Saved' },
            { type: 'rich_card', title: 'Card', actions: [{ type: 'call', label: 'Call', phoneNumber: '+1555' }] },
          ],
          end: true,
        },
      ],
    })
    const result = preflightLiveRcsFlow(flow)

    expect(result.success).toBe(false)
    expect(result.errors.map((error) => error.message).join('\n')).toContain('no native Live RCS mapping')
    expect(result.errors.map((error) => error.message).join('\n')).toContain('Use "reply" or "open_url"')
  })

  it('rejects unattached suggestions and public non-HTTPS URLs', () => {
    const flow = flowDefinitionSchema.parse({
      ...baseFlow,
      nodes: [
        {
          id: 'start',
          messages: [
            { type: 'suggested_replies', options: [{ label: 'No' }] },
            { type: 'image', url: 'http://cdn.example/image.jpg' },
          ],
          end: true,
        },
      ],
    })
    const result = preflightLiveRcsFlow(flow)

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors.map((error) => error.message).join('\n')).toContain('Suggestions must immediately follow')
    expect(result.errors.map((error) => error.message).join('\n')).toContain('must use HTTPS')
  })
})
