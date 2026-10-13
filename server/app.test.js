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

async function startTestServer() {
  const config = getLiveDemoConfig({
    LIVE_RCS_MODE: 'fake',
    LIVE_RCS_TEST_RECIPIENT: '+15551234567',
    LIVE_RCS_OPERATOR_TOKEN: 'operator-token',
    LIVE_RCS_ALLOWED_FLOW_IDS: 'test-live-flow',
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

  it('requires an operator token before creating a live session', async () => {
    const origin = await startTestServer()
    const response = await fetch(`${origin}/api/live/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } })
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