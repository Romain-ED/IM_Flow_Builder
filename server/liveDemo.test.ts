import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FakeRcsGateway, FileLiveSessionStore, getLiveDemoConfig, LiveDemoService, verifyWebhook } from './liveDemo.js'

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
  LIVE_RCS_ALLOWED_FLOW_IDS: 'test-live-flow',
}

const flow = {
  metadata: { id: 'test-live-flow', channel: 'rcs', trigger: 'START DEMO', livePublicVariables: ['chosen'] },
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

const menuFlow = {
  metadata: { id: 'rcs-demo-menu', channel: 'rcs', trigger: 'RCS MENU' },
  variables: {},
  start: 'welcome',
  nodes: [
    { id: 'welcome', messages: [{ type: 'text', text: 'Menu welcome' }], end: true },
  ],
}

async function startTriggeredSession(service, flowToStart = flow) {
  const started = await service.createSession({ flow: flowToStart })
  if (flowToStart.metadata.id === 'rcs-demo-menu') {
    return service.handleInbound({ message_uuid: `trigger-${started.id}`, text: ` ${flowToStart.metadata.trigger} ` })
  }
  return service.getSession(started.id)
}

describe('LiveDemoService', () => {
  it('runs a fixed-recipient fake session through an inbound postback and status callback', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())

    const started = await service.createSession({ flow })
    expect(started.status).toBe('awaiting_reply')
    expect(started.timeline).toHaveLength(1)
    expect(started.timeline[0].message).toMatchObject({ type: 'text', text: 'Hello [hidden]' })

    const ignoredTrigger = await service.handleInbound({ message_uuid: 'trigger-1', text: '  start demo  ' })
    expect(ignoredTrigger.status).toBe('awaiting_reply')
    // The flow ignores the text, but the user's message stays visible in the conversation.
    expect(ignoredTrigger.timeline).toHaveLength(2)
    expect(ignoredTrigger.timeline[1]).toMatchObject({ sender: 'user', message: { type: 'text', text: 'start demo' } })

    const completed = await service.handleInbound({ message_uuid: 'inbound-1', reply: { id: 'welcome:m:1:reply:0' } })
    expect(completed.status).toBe('completed')
    expect(completed.timeline).toHaveLength(4)
    expect(completed.timeline[2].sender).toBe('user')
    expect(completed.timeline[2].message).toMatchObject({ type: 'text', text: 'Continue' })

    const providerMessageId = service.store.get(started.id).outbound[0].providerMessageId
    const withStatus = service.handleStatus({ message_uuid: providerMessageId, status: 'read' })
    expect(withStatus.provider.latestStatus).toBe('read')
  })

  it('keeps near-match text in the RCS MENU waiting state and rejects missing triggers', async () => {
    const config = getLiveDemoConfig({ ...env, LIVE_RCS_ALLOWED_FLOW_IDS: 'rcs-demo-menu' }, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    const waiting = await service.createSession({ flow: menuFlow })
    expect(waiting.status).toBe('awaiting_trigger')
    expect(waiting.timeline).toHaveLength(0)

    const nearMatch = await service.handleInbound({ message_uuid: 'near-match', text: 'RCS MENU now' })
    expect(nearMatch.status).toBe('awaiting_trigger')
    expect(nearMatch.timeline).toHaveLength(1)
    expect(nearMatch.timeline[0]).toMatchObject({ sender: 'user', message: { text: 'RCS MENU now' } })

    const exact = await service.handleInbound({ message_uuid: 'exact-after-near-match', text: ' rcs menu ' })
    expect(exact.status).toBe('completed')
    expect(exact.timeline).toHaveLength(3)
    expect(waiting.id).toBe(exact.id)

    await expect(service.createSession({
      flow: { ...flow, metadata: { ...flow.metadata, trigger: '   ' } },
    })).rejects.toThrow('metadata.trigger')
  })
  it('retires persisted non-menu trigger-waiting sessions so they cannot block a new start', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'live-demo-'))
    const path = join(directory, 'sessions.json')
    writeFileSync(path, JSON.stringify({ sessions: [{
      id: 'legacy-session',
      status: 'awaiting_trigger',
      flow: { metadata: { id: 'test-live-flow', channel: 'rcs', trigger: 'START DEMO' } },
      recipient: '+15551234567',
    }] }))
    try {
      const store = new FileLiveSessionStore(path)
      expect(store.get('legacy-session').status).toBe('stopped')
      const service = new LiveDemoService(getLiveDemoConfig(env, process.cwd()), store, new FakeRcsGateway())
      const started = await service.createSession({ flow })
      expect(started.status).toBe('awaiting_reply')
      expect(started.timeline).toHaveLength(1)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('updates the configured recipient status after normalizing its address', async () => {
    const config = getLiveDemoConfig({
      ...env,
      LIVE_RCS_MODE: 'vonage',
      LIVE_RCS_DEMO_EPHEMERAL_STORAGE: 'true',
      LIVE_RCS_RCS_AGENT_ID: 'agent-123',
      LIVE_RCS_VONAGE_APPLICATION_ID: 'application-123',
      LIVE_RCS_VONAGE_SIGNATURE_SECRET: 'signature-secret',
      LIVE_RCS_VONAGE_JWT: 'short-lived-token',
    }, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    const waiting = await service.createSession({ flow, recipient: ' +1 555-123-4567 ' })
    expect(waiting.status).toBe('awaiting_reply')
    const started = await service.handleInbound({ message_uuid: 'recipient-trigger', text: 'START DEMO', channel: 'rcs', from: '+15551234567', to: 'agent-123' })
    const providerMessageId = service.store.get(started.id).outbound[0].providerMessageId

    const updated = service.handleStatus({
      message_uuid: providerMessageId,
      status: 'delivered',
      channel: 'rcs',
      to: '+15551234567',
      from: 'agent-123',
    })

    expect(updated.provider.latestStatus).toBe('delivered')
  })

  it('rejects a destination outside the configured test recipient', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())

    await expect(service.createSession({ flow, recipient: '+15559876543' })).rejects.toThrow('not authorized')
  })

  it('routes a menu carousel postback into the selected target flow using its metadata allowlist id', async () => {
    const config = getLiveDemoConfig({ ...env, LIVE_RCS_ALLOWED_FLOW_IDS: 'rcs-demo-menu,singapore-airlines-boarding-pass' }, process.cwd())
    const targetFlow = {
      metadata: { id: 'singapore-airlines-boarding-pass', channel: 'rcs', trigger: 'SIA START' },
      variables: { selected: false },
      start: 'welcome',
      nodes: [{ id: 'welcome', messages: [{ type: 'text', text: 'Target welcome' }], end: true }],
    }
    const menuFlow = {
      metadata: { id: 'rcs-demo-menu', channel: 'rcs', trigger: 'RCS MENU' },
      start: 'welcome',
      nodes: [{
        id: 'welcome',
        messages: [{ type: 'carousel', cards: [{
          id: 'singapore-airlines',
          title: 'Singapore Airlines',
          actions: [{ type: 'reply', label: 'Start Singapore Airlines', startScenarioId: 'singapore-airlines' }],
        }] }],
      }],
    }
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    const waiting = await service.createSession({ flow: menuFlow, catalog: [{ id: 'singapore-airlines', flow: targetFlow }] })
    expect(waiting.status).toBe('awaiting_trigger')
    expect(waiting.timeline).toHaveLength(0)
    const started = await service.handleInbound({ message_uuid: `menu-trigger-${waiting.id}`, text: 'RCS MENU' })
    expect(started.status).toBe('awaiting_reply')
    const result = await service.handleInbound({ message_uuid: 'menu-selection-1', reply: { id: 'welcome:m:0:action:0' } })
    expect(result.status).toBe('completed')
    expect(result.currentNodeId).toBe('welcome')
    expect(result.timeline.at(-1).message).toMatchObject({ type: 'text', text: 'Target welcome' })
    expect(result.timeline.at(-1).nodeId).toBe('welcome')
    expect(JSON.stringify(result)).not.toContain('startScenarioId')
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
    const started = await startTriggeredSession(service, carouselFlow)
    expect(started.status).toBe('awaiting_reply')
    const result = await service.handleInbound({ message_uuid: 'carousel-reply-1', reply: { id: 'welcome:m:1:action:0' } })
    expect(result.status).toBe('completed')
    expect(result.variables.chosen).toBe(true)
    expect(result.timeline.at(-1).message).toMatchObject({ type: 'text', text: 'Ordered' })
  })

  it('deduplicates retried inbound callbacks without advancing twice', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await startTriggeredSession(service)

    const first = await service.handleInbound({ message_uuid: 'repeat-event', reply: { id: 'welcome:m:1:reply:0' } })
    const second = await service.handleInbound({ message_uuid: 'repeat-event', reply: { id: 'welcome:m:1:reply:0' } })

    expect(second.timeline).toHaveLength(first.timeline.length)
  })

  it('clears the previous conversation projection when restarting a non-menu flow', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    const started = await startTriggeredSession(service)
    await service.handleInbound({ message_uuid: 'restart-reply', reply: { id: 'welcome:m:1:reply:0' } })

    const restarted = await service.restartSession(started.id)

    expect(restarted.status).toBe('awaiting_reply')
    expect(restarted.timeline).toHaveLength(1)
    expect(restarted.timeline[0].message).toMatchObject({ type: 'text', text: 'Hello [hidden]' })
  })

  it('restarts the RCS MENU flow in its phone-trigger waiting state', async () => {
    const config = getLiveDemoConfig({ ...env, LIVE_RCS_ALLOWED_FLOW_IDS: 'rcs-demo-menu' }, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    const started = await startTriggeredSession(service, menuFlow)

    const restarted = await service.restartSession(started.id)

    expect(restarted.status).toBe('awaiting_trigger')
    expect(restarted.timeline).toHaveLength(0)
  })
  it('routes free text through the active input and global trigger rules', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const inputFlow = {
      ...flow,
      metadata: { ...flow.metadata, livePublicVariables: ['chosen', 'code'] },
      triggers: [{ keywords: ['cancel'], next: 'cancelled' }],
      nodes: [
        { id: 'welcome', messages: [{ type: 'text', text: 'Enter a code' }, { type: 'input', inputType: 'text', variable: 'code', next: 'done' }] },
        { id: 'done', messages: [{ type: 'text', text: 'Code {{code}}' }], end: true },
        { id: 'cancelled', messages: [{ type: 'text', text: 'Cancelled' }], end: true },
      ],
    }
    const serviceWithInput = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await startTriggeredSession(serviceWithInput, inputFlow)

    const result = await serviceWithInput.handleInbound({ message_uuid: 'text-1', text: 'cancel' })
    expect(result.timeline.at(-1).message.text).toBe('Cancelled')

    const serviceWithPlainInput = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await startTriggeredSession(serviceWithPlainInput, inputFlow)
    const plainResult = await serviceWithPlainInput.handleInbound({ message_uuid: 'text-2', text: '12345' })
    expect(plainResult.timeline.at(-1).message.text).toBe('Code [hidden]')
  })

  it('does not expose secrets through public diagnostics and accepts unsigned fake-mode callbacks', () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const diagnostics = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway()).diagnostics()
    const rawBody = Buffer.from(JSON.stringify({ message_uuid: 'message' }))

    expect(JSON.stringify(diagnostics)).not.toContain('+15551234567')
    expect(verifyWebhook(config, rawBody)).toEqual({ valid: true, jti: null })
  })
})


describe('ephemeral Live RCS demo storage', () => {
  it('permits a one-instance Vonage demo only when explicitly opted in', () => {
    const config = getLiveDemoConfig({
      LIVE_RCS_MODE: 'vonage',
      LIVE_RCS_TEST_RECIPIENT: '+15551234567',
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

describe('always-on flow auto-start', () => {
  const menuFlow = {
    metadata: { id: 'rcs-demo-menu', channel: 'rcs', trigger: 'RCS MENU' },
    variables: {},
    start: 'welcome',
    nodes: [
      {
        id: 'welcome',
        messages: [
          { type: 'text', text: 'Welcome to the menu' },
          { type: 'suggested_replies', options: [{ label: 'Option A', next: 'done' }] },
        ],
      },
      { id: 'done', messages: [{ type: 'text', text: 'Done' }], end: true },
    ],
  }

  const vonageEnv = {
    LIVE_RCS_MODE: 'vonage',
    LIVE_RCS_TEST_RECIPIENT: '+15551234567',
    LIVE_RCS_ALLOWED_FLOW_IDS: 'test-live-flow',
    LIVE_RCS_DEMO_EPHEMERAL_STORAGE: 'true',
    LIVE_RCS_RCS_AGENT_ID: 'agent-123',
    LIVE_RCS_VONAGE_APPLICATION_ID: 'app-123',
    LIVE_RCS_VONAGE_SIGNATURE_SECRET: 'sig-secret',
    LIVE_RCS_VONAGE_JWT: 'jwt',
    LIVE_RCS_ALWAYS_ON_FLOW_PATH: '/fake/path.json',
  }

  function makeVonageService() {
    const config = getLiveDemoConfig(vonageEnv, process.cwd())
    const sessions = []
    const store = {
      list: () => sessions,
      get: (id) => sessions.find((s) => s.id === id) ?? null,
      save: (s) => { const i = sessions.findIndex((x) => x.id === s.id); if (i < 0) sessions.push(s); else sessions[i] = s },
    }
    const service = new LiveDemoService(config, store, new FakeRcsGateway())
    service._alwaysOnFlowCache = { flow: menuFlow, catalog: undefined }
    return service
  }

  function fakeInbound(overrides) {
    return { channel: 'rcs', to: 'agent-123', from: '+15551234567', ...overrides }
  }

  it('auto-starts a session and processes the trigger when no session exists', async () => {
    const service = makeVonageService()
    const result = await service.handleInbound(fakeInbound({ message_uuid: 'auto-1', text: 'RCS MENU' }))
    expect(result.status).toBe('awaiting_reply')
    expect(result.timeline).toHaveLength(2)
    expect(result.timeline[0].message).toMatchObject({ type: 'text', text: 'RCS MENU' })
    expect(result.timeline[1].message).toMatchObject({ type: 'text', text: 'Welcome to the menu' })
    const diagnostics = service.diagnosticEvents.map((e) => e.type)
    expect(diagnostics).toContain('auto_start_session_created')
  })

  it('auto-starts independent sessions for concurrent senders', async () => {
    const service = makeVonageService()
    const r1 = await service.handleInbound(fakeInbound({ message_uuid: 'c1', text: 'rcs menu', from: '+15551234567' }))
    const r2 = await service.handleInbound(fakeInbound({ message_uuid: 'c2', text: 'rcs menu', from: '+15559990002' }))
    expect(r1.id).not.toBe(r2.id)
    expect(service.store.list()).toHaveLength(2)
    expect(r1.status).toBe('awaiting_reply')
    expect(r2.status).toBe('awaiting_reply')
  })

  it('restarts the menu when the sender sends the trigger again while a session is waiting for a reply', async () => {
    const service = makeVonageService()
    const first = await service.handleInbound(fakeInbound({ message_uuid: 'first', text: 'RCS MENU' }))
    expect(first.status).toBe('awaiting_reply')
    const second = await service.handleInbound(fakeInbound({ message_uuid: 'second', text: 'rcs menu' }))
    expect(second.id).not.toBe(first.id)
    expect(second.status).toBe('awaiting_reply')
    expect(second.timeline[1].message).toMatchObject({ text: 'Welcome to the menu' })
    const sessions = service.store.list()
    expect(sessions.find((s) => s.id === first.id).status).toBe('stopped')
    expect(sessions.filter((s) => s.status === 'awaiting_reply')).toHaveLength(1)
  })

  it('does not restart on a duplicate delivery of the same trigger event', async () => {
    const service = makeVonageService()
    const first = await service.handleInbound(fakeInbound({ message_uuid: 'dup', text: 'RCS MENU' }))
    const again = await service.handleInbound(fakeInbound({ message_uuid: 'dup', text: 'RCS MENU' }))
    expect(again.id).toBe(first.id)
    expect(service.store.list()).toHaveLength(1)
  })

  it('reports an always-on flow that fails to load (e.g. flow id not allowlisted) in diagnostics', () => {
    const service = makeVonageService()
    service._alwaysOnFlowCache = undefined
    expect(service.diagnostics().alwaysOnFlow).toMatch(/^error: /)
  })

  it('does not auto-start an inbound trigger for a non-menu flow', async () => {
    const service = makeVonageService()
    service._alwaysOnFlowCache = { flow: { ...menuFlow, metadata: { ...menuFlow.metadata, id: 'test-live-flow' } }, catalog: undefined }
    await expect(
      service.handleInbound(fakeInbound({ message_uuid: 'non-menu', text: 'RCS MENU' })),
    ).rejects.toThrow('No active Live RCS session matches this inbound event.')
    expect(service.store.list()).toHaveLength(0)
  })

  it('does not auto-start when the trigger text does not match', async () => {
    const service = makeVonageService()
    await expect(
      service.handleInbound(fakeInbound({ message_uuid: 'no-match', text: 'HELLO' })),
    ).rejects.toThrow('No active Live RCS session matches this inbound event.')
    expect(service.store.list()).toHaveLength(0)
  })
  it('keeps free text and non-text messages that match no session for the Conversations page', async () => {
    const service = makeVonageService()
    await expect(service.handleInbound(fakeInbound({ message_uuid: 'loose-1', text: 'Is anyone there?' }))).rejects.toThrow('No active Live RCS session')
    // A redelivery of the same event must not duplicate the message.
    await expect(service.handleInbound(fakeInbound({ message_uuid: 'loose-1', text: 'Is anyone there?' }))).rejects.toThrow('No active Live RCS session')
    await expect(service.handleInbound(fakeInbound({ message_uuid: 'loose-2', text: undefined, message_type: 'image' }))).rejects.toThrow('No active Live RCS session')

    const conversations = service.conversations()
    expect(conversations).toHaveLength(1)
    expect(conversations[0].unmatched.map((message) => message.text)).toEqual(['Is anyone there?', '[image message]'])
    expect(conversations[0].messageCount).toBe(2)
    expect(conversations[0].lastMessage).toMatchObject({ sender: 'user', preview: '[image message]' })
    expect(service.store.list()).toHaveLength(0)
  })
  it('ignores unmatched inbound messages that are not RCS or not addressed to the agent', async () => {
    const service = makeVonageService()
    await expect(service.handleInbound(fakeInbound({ message_uuid: 'sms-1', text: 'hi', channel: 'sms' }))).rejects.toThrow()
    await expect(service.handleInbound(fakeInbound({ message_uuid: 'other-agent', text: 'hi', to: 'someone-else' }))).rejects.toThrow()
    expect(service.conversations()).toHaveLength(0)
  })

  it('does not auto-start when LIVE_RCS_ALWAYS_ON_FLOW_PATH is not configured', async () => {
    const config = getLiveDemoConfig(env, process.cwd())
    const service = new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway())
    await expect(
      service.handleInbound({ message_uuid: 'no-config', text: 'RCS MENU', from: '+15559990001' }),
    ).rejects.toThrow('No active Live RCS session matches this inbound event.')
    expect(service.store.list()).toHaveLength(0)
  })

  it('exposes alwaysOnFlow status in public diagnostics', () => {
    const configWithPath = getLiveDemoConfig({ ...env, LIVE_RCS_ALWAYS_ON_FLOW_PATH: '/some/path.json' }, process.cwd())
    const configWithout = getLiveDemoConfig(env, process.cwd())
    const withPath = new LiveDemoService(configWithPath, new MemoryStore(), new FakeRcsGateway())
    withPath._alwaysOnFlowCache = { flow: menuFlow, catalog: undefined }
    expect(withPath.diagnostics().alwaysOnFlow).toBe('configured')
    expect(new LiveDemoService(configWithout, new MemoryStore(), new FakeRcsGateway()).diagnostics().alwaysOnFlow).toBe('not configured')
  })

  it('does not block createSession for the configured recipient when an always-on session is active for a different sender', async () => {
    const config = getLiveDemoConfig({ ...vonageEnv, LIVE_RCS_ALLOWED_FLOW_IDS: 'rcs-demo-menu' }, process.cwd())
    const sessions = []
    const store = {
      list: () => sessions,
      get: (id) => sessions.find((s) => s.id === id) ?? null,
      save: (s) => { const i = sessions.findIndex((x) => x.id === s.id); if (i < 0) sessions.push(s); else sessions[i] = s },
    }
    const service = new LiveDemoService(config, store, new FakeRcsGateway())
    service._alwaysOnFlowCache = { flow: menuFlow, catalog: undefined }
    // Auto-start a session for a different customer sender (+15559990003)
    await service.handleInbound(fakeInbound({ message_uuid: 'ao-1', text: 'RCS MENU', from: '+15559990003' }))
    expect(service.store.list()).toHaveLength(1)
    // UI presenter must still be able to start a session for the configured test recipient
    await expect(service.createSession({
      flow: menuFlow,
      recipient: vonageEnv.LIVE_RCS_TEST_RECIPIENT,
    })).resolves.toBeDefined()
    expect(service.store.list()).toHaveLength(2)
  })
})