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
  metadata: { id: 'test-live-flow', channel: 'rcs', livePublicVariables: ['chosen'] },
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
    expect(started.timeline).toHaveLength(1)
    expect(started.timeline[0].message).toMatchObject({ type: 'text', text: 'Hello [hidden]' })

    const completed = await service.handleInbound({ message_uuid: 'inbound-1', reply: { id: 'welcome:m:1:reply:0' } })
    expect(completed.status).toBe('completed')
    expect(completed.timeline).toHaveLength(3)
    expect(completed.timeline[1].sender).toBe('user')
    expect(completed.timeline[1].message).toMatchObject({ type: 'text', text: 'Continue' })

    const providerMessageId = service.store.get(started.id).outbound[1].providerMessageId
    const withStatus = service.handleStatus({ message_uuid: providerMessageId, status: 'read' })
    expect(withStatus.provider.latestStatus).toBe('read')
  })

  it('updates an allowlisted selected recipient status after normalizing its address', async () => {
    const config = getLiveDemoConfig({
      ...env,
      LIVE_RCS_MODE: 'vonage',
      LIVE_RCS_ALLOWED_RECIPIENTS: '+15557654321',
      LIVE_RCS_DEMO_EPHEMERAL_STORAGE: 'true',
      LIVE_RCS_RCS_AGENT_ID: 'agent-123',
      LIVE_RCS_VONAGE_APPLICATION_ID: 'application-123',
      LIVE_RCS_VONAGE_SIGNATURE_SECRET: 'signature-secret',
      LIVE_RCS_VONAGE_JWT: 'short-lived-token',
    }, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    const started = await service.createSession({ flow, recipient: ' +1 555-765-4321 ' })
    const providerMessageId = service.store.get(started.id).outbound[0].providerMessageId

    const updated = service.handleStatus({
      message_uuid: providerMessageId,
      status: 'delivered',
      channel: 'rcs',
      to: '+15557654321',
      from: 'agent-123',
    })

    expect(updated.provider.latestStatus).toBe('delivered')
  })

  it('rejects a destination outside the configured recipient allowlist', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())

    await expect(service.createSession({ flow, recipient: '+15559876543' })).rejects.toThrow('not authorized')
  })

  it('routes carousel-card reply postbacks and applies their state', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const carouselFlow = {
      ...flow,
      nodes: [
        {
          id: 'welcome',
          messages: [
            { type: 'text', text: 'Pick a deal' },
            {
              type: 'carousel',
              cards: [{
                id: 'deal',
                title: 'Deal',
                image: '/assets/deal.jpg',
                actions: [{ type: 'reply', label: 'Order', next: 'done', set: { chosen: true } }],
              }],
            },
          ],
        },
        { id: 'done', messages: [{ type: 'text', text: 'Ordered' }], end: true },
      ],
    }
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await service.createSession({ flow: carouselFlow })

    const result = await service.handleInbound({ message_uuid: 'carousel-reply-1', reply: { id: 'welcome:m:1:action:0' } })

    expect(result.status).toBe('completed')
    expect(result.variables.chosen).toBe(true)
    expect(result.timeline.at(-1).message).toMatchObject({ type: 'text', text: 'Ordered' })
  })

  it('deduplicates retried inbound callbacks without advancing twice', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await service.createSession({ flow })

    const first = await service.handleInbound({ message_uuid: 'repeat-event', reply: { id: 'welcome:m:1:reply:0' } })
    const second = await service.handleInbound({ message_uuid: 'repeat-event', reply: { id: 'welcome:m:1:reply:0' } })

    expect(second.timeline).toHaveLength(first.timeline.length)
  })

  it('clears the previous conversation projection when restarting', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    const started = await service.createSession({ flow })
    await service.handleInbound({ message_uuid: 'restart-reply', reply: { id: 'welcome:m:1:reply:0' } })

    const restarted = await service.restartSession(started.id)

    expect(restarted.timeline).toHaveLength(1)
    expect(restarted.timeline[0].sender).toBe('business')
    expect(restarted.timeline[0].message).toMatchObject({ type: 'text' })
    expect(restarted.timeline.some((item) => item.message.text === 'Continue')).toBe(false)
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
    expect(result.timeline.at(-1).message.text).toBe('Cancelled')
  })

  it('does not expose secrets through public diagnostics and accepts unsigned fake-mode callbacks', () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const diagnostics = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway()).diagnostics()
    const rawBody = Buffer.from(JSON.stringify({ message_uuid: 'message' }))

    expect(JSON.stringify(diagnostics)).not.toContain('test-operator-token')
    expect(verifyWebhook(config, rawBody)).toEqual({ valid: true, jti: null })
  })
})


describe('ephemeral Live RCS demo storage', () => {
  it('permits a one-instance Vonage demo only when explicitly opted in', () => {
    const config = getLiveDemoConfig({
      LIVE_RCS_MODE: 'vonage',
      LIVE_RCS_TEST_RECIPIENT: '+15551234567',
      LIVE_RCS_OPERATOR_TOKEN: 'operator-token',
      LIVE_RCS_ALLOWED_FLOW_IDS: 'test-live-flow',
      LIVE_RCS_RCS_AGENT_ID: 'agent-123',
      LIVE_RCS_VONAGE_APPLICATION_ID: 'application-123',
      LIVE_RCS_VONAGE_SIGNATURE_SECRET: 'signature-secret',
      LIVE_RCS_VONAGE_JWT: 'short-lived-token',
      LIVE_RCS_DEMO_EPHEMERAL_STORAGE: 'true',
    }, process.cwd())

    expect(config.configured).toBe(true)
    expect(config.storageDurable).toBe(false)
    expect(config.demoEphemeralStorage).toBe(true)
    expect(new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway()).diagnostics().storage).toContain('sessions are lost on restart')
  })

  it('does not treat the default filesystem as durable without an explicit demo opt-in', () => {
    const config = getLiveDemoConfig({
      LIVE_RCS_MODE: 'vonage',
      LIVE_RCS_TEST_RECIPIENT: '+15551234567',
      LIVE_RCS_OPERATOR_TOKEN: 'operator-token',
      LIVE_RCS_ALLOWED_FLOW_IDS: 'test-live-flow',
      LIVE_RCS_RCS_AGENT_ID: 'agent-123',
      LIVE_RCS_VONAGE_APPLICATION_ID: 'application-123',
      LIVE_RCS_VONAGE_SIGNATURE_SECRET: 'signature-secret',
      LIVE_RCS_VONAGE_JWT: 'short-lived-token',
    }, process.cwd())

    expect(config.configured).toBe(false)
    expect(config.errors.join('\n')).toContain('LIVE_RCS_STORAGE_DURABLE=true or LIVE_RCS_DEMO_EPHEMERAL_STORAGE=true')
  })
})