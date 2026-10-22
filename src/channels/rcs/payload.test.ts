import { describe, expect, it } from 'vitest'
import type { NormalizedMessage } from '../../engine/types'
import { buildRcsPayload } from './payload'

const message = (message: NormalizedMessage['message'], nodeId = 'welcome'): NormalizedMessage => ({
  runtimeId: `${nodeId}-${message.type}`,
  nodeId,
  timestamp: 1,
  message,
})

describe('buildRcsPayload', () => {
  it('maps rich cards and attaches RCS suggestions to card content', () => {
    const result = buildRcsPayload([
      message({ type: 'rich_card', sender: 'business', title: 'Offer', image: '/offer.jpg' }),
      message({ type: 'suggested_replies', sender: 'business', options: [{ label: 'Claim', value: 'claim' }] }),
    ])

    expect(result.warnings).toEqual([])
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toMatchObject({
      contentMessage: {
        richCard: {
          standaloneCard: {
            cardContent: {
              title: 'Offer',
              media: { contentInfo: { fileUrl: '/offer.jpg' } },
              suggestions: [{ reply: { text: 'Claim', postbackData: 'claim' } }],
            },
          },
        },
      },
    })
  })

  it('reports simulator-only messages without dropping native payloads', () => {
    const result = buildRcsPayload([
      message({ type: 'text', sender: 'business', text: 'Hello' }),
      message({ type: 'list', sender: 'business', title: 'Menu', buttonLabel: 'Open', sections: [{ rows: [{ id: 'one', title: 'One' }] }] }),
    ])

    expect(result.messages).toHaveLength(1)
    expect(result.warnings).toEqual(['The list message has no native RCS payload in this preview.'])
  })
})
