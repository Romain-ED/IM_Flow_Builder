import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { FakeRcsGateway, getLiveDemoConfig, LiveDemoService, verifyWebhook } from './liveDemo.js'

class MemoryStore {
  constructor() { this.sessions = [] }
  list() { return this.sessions }
  get(id) { return this.sessions.find((session) => session.id === id) ?? null }
  save(session) {
    const index = this.sessions.findIndex((candidate) => candidate.id === session.id)
    if (index < 0) this.sessions.push(session)
    else this.sessions[index] = session
    return session
  }
}

const env = {
  LIVE_RCS_MODE: 'fake',
  LIVE_RCS_TEST_RECIPIENT: '+15551234567',
  LIVE_RCS_OPERATOR_TOKEN: 'test-operator-token',
  LIVE_RCS_ALLOWED_FLOW_IDS: 'test-live-flow',
}

const flow = {
  metadata: { id: 'test-live-flow', channel: 'rcs' },
  variables: { name: 'Romain' },
  start: 'welcome',
  nodes: [
    {
      id: 'welcome',
      messages: [
        { type: 'text', text: 'Hello {{name}}' },
        { type: 'suggested_replies', options: [{ label: 'Continue', next: 'done', set: { chosen: true } }] },
      ],
    },
    { id: 'done', messages: [{ type: 'text', text: 'Complete' }], end: true },
  ],
}

describe('LiveDemoService', () => {
  it('runs a fixed-recipient fake session through an inbound postback and status callback', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())

    const started = await service.createSession({ flow })
    expect(started.status).toBe('awaiting_reply')
    expect(started.outbound).toHaveLength(1)
    expect(started.outbound[0].content).toMatchObject({ type: 'text', text: 'Hello Romain' })

    const completed = await service.handleInbound({ message_uuid: 'inbound-1', reply: { id: 'welcome:m:1:reply:0' } })
    expect(completed.status).toBe('completed')
    expect(completed.outbound).toHaveLength(2)
    expect(completed.events.some((entry) => entry.type === 'inbound_reply')).toBe(true)

    const withStatus = service.handleStatus({ message_uuid: completed.outbound[1].providerMessageId, status: 'read' })
    expect(withStatus.outbound[1].status).toBe('read')
  })

  it('deduplicates retried inbound callbacks without advancing twice', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await service.createSession({ flow })

    const first = await service.handleInbound({ message_uuid: 'repeat-event', reply: { id: 'welcome:m:1:reply:0' } })
    const second = await service.handleInbound({ message_uuid: 'repeat-event', reply: { id: 'welcome:m:1:reply:0' } })

    expect(second.outbound).toHaveLength(first.outbound.length)
  })

  it('routes free text through the active input and global trigger rules', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const inputFlow = {
      ...flow,
      triggers: [{ keywords: ['cancel'], next: 'cancelled' }],
      nodes: [
        { id: 'welcome', messages: [{ type: 'text', text: 'Enter a code' }, { type: 'input', inputType: 'text', variable: 'code', next: 'done' }] },
        { id: 'done', messages: [{ type: 'text', text: 'Code {{code}}' }], end: true },
        { id: 'cancelled', messages: [{ type: 'text', text: 'Cancelled' }], end: true },
      ],
    }
    const serviceWithInput = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await serviceWithInput.createSession({ flow: inputFlow })

    const result = await serviceWithInput.handleInbound({ message_uuid: 'text-1', text: 'cancel' })
    expect(result.outbound.at(-1).content.text).toBe('Cancelled')
  })

  it('does not expose secrets through public diagnostics and verifies signed webhooks', () => {
    const config = getLiveDemoConfig({ ...env, LIVE_RCS_WEBHOOK_SECRET: 'webhook-secret' }, process.cwd())
    const diagnostics = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway()).diagnostics()
    const rawBody = JSON.stringify({ message_uuid: 'message' })
    const signature = createHmac('sha256', 'webhook-secret').update(rawBody).digest('hex')

    expect(JSON.stringify(diagnostics)).not.toContain('webhook-secret')
    expect(JSON.stringify(diagnostics)).not.toContain('test-operator-token')
    expect(verifyWebhook(config, rawBody, signature)).toBe(true)
    expect(verifyWebhook(config, rawBody, 'wrong')).toBe(false)
  })
})
