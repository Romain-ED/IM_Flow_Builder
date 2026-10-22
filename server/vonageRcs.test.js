import { createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { getLiveDemoConfig, VonageRcsGateway } from './liveDemo.js'
import { toVonageRcsMessage, verifyVonageSignedWebhook } from './vonageRcs.js'

const config = getLiveDemoConfig({
  LIVE_RCS_MODE: 'vonage',
  LIVE_RCS_TEST_RECIPIENT: '+6597502284',
  LIVE_RCS_OPERATOR_TOKEN: 'operator-token',
  LIVE_RCS_ALLOWED_FLOW_IDS: 'singapore-airlines-boarding-pass',
  LIVE_RCS_RCS_AGENT_ID: 'agent-123',
  LIVE_RCS_VONAGE_APPLICATION_ID: 'application-123',
  LIVE_RCS_VONAGE_SIGNATURE_SECRET: 'signature-secret',
  LIVE_RCS_VONAGE_JWT: 'outbound-bearer-token',
  LIVE_RCS_STORAGE_DURABLE: 'true',
}, process.cwd())

function signedWebhook(rawBody, overrides = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const claims = Buffer.from(JSON.stringify({
    iss: 'Vonage',
    application_id: 'application-123',
    iat: 1_700_000_000,
    jti: 'callback-123',
    payload_hash: createHash('sha256').update(rawBody).digest('hex'),
    ...overrides,
  })).toString('base64url')
  const signature = createHmac('sha256', 'signature-secret').update(`${header}.${claims}`).digest('base64url')
  return `Bearer ${header}.${claims}.${signature}`
}

describe('Vonage RCS transport', () => {
  it('serializes text suggestions with stable postback data', () => {
    const payload = toVonageRcsMessage({
      id: 'welcome:m:0:content:0',
      type: 'text',
      text: 'Choose an option',
      replies: [{ id: 'welcome:m:1:reply:0', label: 'Continue', next: 'next' }],
      actions: [{ id: 'welcome:m:1:action:1', label: 'Open site', kind: 'open_url', url: 'https://example.com' }],
    }, config)

    expect(payload).toMatchObject({
      to: '+6597502284',
      from: 'agent-123',
      channel: 'rcs',
      message_type: 'text',
      suggestions: [
        { type: 'reply', text: 'Continue', postback_data: 'welcome:m:1:reply:0' },
        { type: 'action', text: 'Open site', postback_data: 'welcome:m:1:action:1', url: 'https://example.com' },
      ],
    })
  })

  it('serializes standalone cards and carousels with card-level replies', () => {
    const card = toVonageRcsMessage({
      id: 'card', type: 'card', title: 'Flight', description: 'Your flight details', url: 'https://example.com/flight.jpg',
      actions: [{ id: 'card:action', label: 'Select', kind: 'reply', next: 'next' }],
    }, config)
    const carousel = toVonageRcsMessage({
      id: 'carousel', type: 'carousel', cards: [
        { id: 'one', title: '21A', imageUrl: 'https://example.com/one.jpg', actions: [{ id: 'one:reply', label: 'Choose 21A', kind: 'reply', next: 'next' }] },
        { id: 'two', title: '21C', actions: [{ id: 'two:reply', label: 'Choose 21C', kind: 'reply', next: 'next' }] },
      ],
    }, config)

    expect(card).toMatchObject({ message_type: 'card', card: { media_url: 'https://example.com/flight.jpg', suggestions: [{ postback_data: 'card:action' }] } })
    expect(carousel).toMatchObject({ message_type: 'carousel', carousel: { cards: [{ suggestions: [{ postback_data: 'one:reply' }] }, { suggestions: [{ postback_data: 'two:reply' }] }] } })
  })

  it('serializes the RCS menu raster logo as carousel media', () => {
    const payload = toVonageRcsMessage({
      id: 'rcs-menu',
      type: 'carousel',
      cards: [{
        id: 'singapore-airlines',
        title: 'Singapore Airlines',
        imageUrl: 'https://demo.example/assets/singapore-airlines/brand-logo.png',
        actions: [{ id: 'menu:action', label: 'Start airline demo', kind: 'reply' }],
      }, { id: 'other', title: 'Other' }],
    }, config)

    expect(payload.message_type).toBe('carousel')
    expect(payload.carousel.cards[0]).toMatchObject({
      media_url: 'https://demo.example/assets/singapore-airlines/brand-logo.png',
    })
  })

  it('verifies an official HS256 signed callback and rejects tampering', () => {
    const rawBody = Buffer.from(JSON.stringify({ message_uuid: 'message-1' }))
    const authorization = signedWebhook(rawBody)

    expect(verifyVonageSignedWebhook(config, rawBody, authorization, 1_700_000_001)).toEqual({ valid: true, jti: 'callback-123' })
    expect(verifyVonageSignedWebhook(config, Buffer.from('{}'), authorization, 1_700_000_001).valid).toBe(false)
    expect(verifyVonageSignedWebhook(config, rawBody, 'Bearer invalid', 1_700_000_001).valid).toBe(false)
    expect(verifyVonageSignedWebhook(config, rawBody, signedWebhook(rawBody, { iss: 'Other' }), 1_700_000_001).valid).toBe(false)
  })

  it('sends the serialized rich payload using a server-only application bearer token', async () => {
    const requests = []
    const gateway = new VonageRcsGateway(config, async (url, request) => {
      requests.push({ url, request })
      return { ok: true, json: async () => ({ message_uuid: 'provider-message-1' }) }
    })

    const result = await gateway.send({ id: 'image', type: 'image', url: 'https://example.com/image.jpg', text: 'Hello' })

    expect(result.providerMessageId).toBe('provider-message-1')
    expect(requests[0].request.headers.Authorization).toBe('Bearer outbound-bearer-token')
    expect(JSON.parse(requests[0].request.body)).toMatchObject({ message_type: 'image', image: { url: 'https://example.com/image.jpg', caption: 'Hello' } })
  })
})
