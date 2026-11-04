import { createHash, createHmac } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { FakeRcsGateway, getLiveDemoConfig, LiveDemoService } from './liveDemo.js'

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

const servers = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))))
})

async function startTestServer(allowedFlowIds = 'test-live-flow') {
  const config = getLiveDemoConfig({
    LIVE_RCS_MODE: 'fake',
    LIVE_RCS_TEST_RECIPIENT: '+15551234567',
    LIVE_RCS_OPERATOR_TOKEN: 'operator-token',
    LIVE_RCS_ALLOWED_FLOW_IDS: allowedFlowIds,
  }, process.cwd())
  const app = createApp({ liveDemo: new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway()) })
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve))
  servers.push(app)
  const address = app.address()
  return `http://127.0.0.1:${address.port}`
}

describe('VCR server live routes', () => {
  it('retains health and exposes sanitized diagnostics', async () => {
    const origin = await startTestServer()
    const [health, diagnostics] = await Promise.all([
      fetch(`${origin}/_/health`),
      fetch(`${origin}/api/live/diagnostics`),
    ])

    expect(await health.text()).toBe('OK')
    expect(diagnostics.status).toBe(200)
    expect(await diagnostics.json()).toMatchObject({ mode: 'fake', ready: true, recipient: expect.stringContaining('4567') })
  })

  it('creates non-menu sessions immediately and keeps inbound entry triggers menu-only', async () => {
    const origin = await startTestServer('test-live-flow,rcs-demo-menu')
    const headers = { Authorization: 'Bearer operator-token', 'Content-Type': 'application/json' }
    const nonMenuFlow = {
      metadata: { id: 'test-live-flow', channel: 'rcs', trigger: 'START DEMO' },
      start: 'welcome',
      nodes: [{ id: 'welcome', messages: [{ type: 'text', text: 'Started immediately' }] }],
    }
    const menuFlow = {
      metadata: { id: 'rcs-demo-menu', channel: 'rcs', trigger: 'RCS MENU' },
      start: 'welcome',
      nodes: [{ id: 'welcome', messages: [{ type: 'text', text: 'Menu started' }], end: true }],
    }

    const nonMenuResponse = await fetch(`${origin}/api/live/sessions`, {
      method: 'POST', headers, body: JSON.stringify({ flow: nonMenuFlow }),
    })
    const nonMenu = await nonMenuResponse.json()
    expect(nonMenuResponse.status).toBe(201)
    expect(nonMenu.status).toBe('awaiting_reply')
    expect(nonMenu.timeline).toHaveLength(1)
    expect(nonMenu.timeline[0].message.text).toBe('Started immediately')

    const ignored = await fetch(`${origin}/webhooks/vonage/inbound`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_uuid: 'non-menu-trigger', text: 'START DEMO' }),
    })
    expect(ignored.status).toBe(202)
    const nonMenuAfterInbound = await fetch(`${origin}/api/live/sessions/${nonMenu.id}`, { headers })
    expect((await nonMenuAfterInbound.json()).timeline).toHaveLength(1)

    const stopped = await fetch(`${origin}/api/live/sessions/${nonMenu.id}/stop`, { method: 'POST', headers })
    expect(stopped.status).toBe(200)

    const menuResponse = await fetch(`${origin}/api/live/sessions`, {
      method: 'POST', headers, body: JSON.stringify({ flow: menuFlow }),
    })
    const menu = await menuResponse.json()
    expect(menuResponse.status).toBe(201)
    expect(menu.status).toBe('awaiting_trigger')
    expect(menu.timeline).toHaveLength(0)

    const triggered = await fetch(`${origin}/webhooks/vonage/inbound`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_uuid: 'menu-trigger', text: ' rcs menu ' }),
    })
    expect(triggered.status).toBe(202)
    const menuAfterTrigger = await fetch(`${origin}/api/live/sessions/${menu.id}`, { headers })
    const startedMenu = await menuAfterTrigger.json()
    expect(startedMenu.status).toBe('completed')
    expect(startedMenu.timeline).toHaveLength(2)
    expect(startedMenu.timeline[0].message.text).toBe('rcs menu')
    expect(startedMenu.timeline[1].message.text).toBe('Menu started')
  })
})


describe('Vonage signed webhook route', () => {
  it('accepts a valid Messages callback JWT and rejects an invalid payload hash', async () => {
    const config = getLiveDemoConfig({
      LIVE_RCS_MODE: 'vonage',
      LIVE_RCS_TEST_RECIPIENT: '+15551234567',
      LIVE_RCS_OPERATOR_TOKEN: 'operator-token',
      LIVE_RCS_ALLOWED_FLOW_IDS: 'test-live-flow',
      LIVE_RCS_RCS_AGENT_ID: 'agent-123',
      LIVE_RCS_VONAGE_APPLICATION_ID: 'application-123',
      LIVE_RCS_VONAGE_SIGNATURE_SECRET: 'signature-secret',
      LIVE_RCS_VONAGE_JWT: 'outbound-token',
      LIVE_RCS_STORAGE_DURABLE: 'true',
    }, process.cwd())
    const app = createApp({ liveDemo: new LiveDemoService(config, new MemoryStore(), new FakeRcsGateway()) })
    await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve))
    servers.push(app)
    const { port } = app.address()
    const body = JSON.stringify({ channel: 'rcs', from: '+15551234567', to: 'agent-123', message_uuid: 'inbound-1', message_type: 'text', text: 'Hello' })
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const claims = Buffer.from(JSON.stringify({
      iss: 'Vonage', application_id: 'application-123', iat: Math.floor(Date.now() / 1000), jti: 'webhook-1',
      payload_hash: createHash('sha256').update(Buffer.from(body)).digest('hex'),
    })).toString('base64url')
    const signature = createHmac('sha256', 'signature-secret').update(`${header}.${claims}`).digest('base64url')
    const valid = await fetch(`http://127.0.0.1:${port}/webhooks/vonage/inbound`, {
      method: 'POST', headers: { Authorization: `Bearer ${header}.${claims}.${signature}`, 'Content-Type': 'application/json' }, body,
    })
    const invalid = await fetch(`http://127.0.0.1:${port}/webhooks/vonage/inbound`, {
      method: 'POST', headers: { Authorization: `Bearer ${header}.${claims}.${signature}`, 'Content-Type': 'application/json' }, body: '{}',
    })

    expect(valid.status).toBe(404)
    expect(invalid.status).toBe(401)
  })
})