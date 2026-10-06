import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const MAX_AUTO_HOPS = 50
const MAX_EVENTS = 500

function enabled(value) {
  return value === 'true' || value === '1'
}

export function getLiveDemoConfig(env = process.env, projectRoot = process.cwd()) {
  const mode = ['disabled', 'fake', 'vonage'].includes(env.LIVE_RCS_MODE) ? env.LIVE_RCS_MODE : 'disabled'
  const allowedFlowIds = (env.LIVE_RCS_ALLOWED_FLOW_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  const errors = []
  if (mode !== 'disabled' && !env.LIVE_RCS_TEST_RECIPIENT) errors.push('LIVE_RCS_TEST_RECIPIENT is required.')
  if (mode !== 'disabled' && !env.LIVE_RCS_OPERATOR_TOKEN) errors.push('LIVE_RCS_OPERATOR_TOKEN is required.')
  if (mode !== 'disabled' && allowedFlowIds.length === 0) errors.push('LIVE_RCS_ALLOWED_FLOW_IDS is required.')
  if (mode === 'vonage') {
    if (!env.LIVE_RCS_VONAGE_JWT) errors.push('LIVE_RCS_VONAGE_JWT is required for Vonage mode.')
    if (!env.LIVE_RCS_RCS_AGENT_ID) errors.push('LIVE_RCS_RCS_AGENT_ID is required for Vonage mode.')
    if (!env.LIVE_RCS_WEBHOOK_SECRET) errors.push('LIVE_RCS_WEBHOOK_SECRET is required for Vonage mode.')
    if (!enabled(env.LIVE_RCS_STORAGE_DURABLE)) errors.push('LIVE_RCS_STORAGE_DURABLE=true is required for Vonage mode.')
  }

  return {
    mode,
    configured: mode !== 'disabled' && errors.length === 0,
    errors,
    recipient: env.LIVE_RCS_TEST_RECIPIENT ?? null,
    allowedFlowIds,
    operatorToken: env.LIVE_RCS_OPERATOR_TOKEN ?? '',
    webhookSecret: env.LIVE_RCS_WEBHOOK_SECRET ?? '',
    vonageJwt: env.LIVE_RCS_VONAGE_JWT ?? '',
    rcsAgentId: env.LIVE_RCS_RCS_AGENT_ID ?? '',
    vonageApiUrl: env.LIVE_RCS_VONAGE_API_URL ?? 'https://api-eu.vonage.com/v1/messages',
    storagePath: resolve(env.LIVE_RCS_STORE_PATH ?? resolve(projectRoot, '.live-rcs-sessions.json')),
    storageDurable: enabled(env.LIVE_RCS_STORAGE_DURABLE),
  }
}

export function publicLiveDemoDiagnostics(config) {
  return {
    mode: config.mode,
    ready: config.configured,
    recipient: config.recipient ? maskRecipient(config.recipient) : null,
    allowedFlowIds: config.allowedFlowIds,
    storage: config.mode === 'vonage' ? (config.storageDurable ? 'durable' : 'not configured') : 'development file store',
    errors: config.errors,
  }
}

function maskRecipient(value) {
  return value.length <= 4 ? '••••' : `${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`
}

function now() {
  return new Date().toISOString()
}

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sessions)) return { sessions: [] }
  return { sessions: raw.sessions }
}

export class FileLiveSessionStore {
  constructor(path) {
    this.path = path
    this.state = this.read()
  }

  read() {
    try {
      return normalizeStore(JSON.parse(readFileSync(this.path, 'utf8')))
    } catch {
      return { sessions: [] }
    }
  }

  write() {
    mkdirSync(dirname(this.path), { recursive: true })
    const temporaryPath = `${this.path}.${process.pid}.tmp`
    writeFileSync(temporaryPath, JSON.stringify(this.state, null, 2), { mode: 0o600 })
    renameSync(temporaryPath, this.path)
  }

  list() {
    return this.state.sessions
  }

  get(id) {
    return this.state.sessions.find((session) => session.id === id) ?? null
  }

  save(session) {
    const index = this.state.sessions.findIndex((entry) => entry.id === session.id)
    if (index === -1) this.state.sessions.push(session)
    else this.state.sessions[index] = session
    this.write()
    return session
  }
}

export class FakeRcsGateway {
  async send(content) {
    return { providerMessageId: `fake-${randomUUID()}`, status: 'submitted', content }
  }
}

/**
 * The Messages API's stable text shape is used directly. Rich RCS content is
 * intentionally kept inside a provider-neutral envelope until the configured
 * agent's authenticated API reference is verified; this prevents a guessed
 * card/carousel JSON payload from being emitted in production.
 */
export class VonageRcsGateway {
  constructor(config, fetchImpl = fetch) {
    this.config = config
    this.fetch = fetchImpl
  }

  async send(content) {
    if (content.type !== 'text') {
      throw new Error(`Vonage rich content mapping for "${content.type}" must be enabled from the agent-specific Messages API reference before production sends.`)
    }
    const response = await this.fetch(this.config.vonageApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.vonageJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.rcsAgentId,
        to: this.config.recipient,
        channel: 'rcs',
        message_type: 'text',
        text: content.text,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Vonage Messages API rejected the message (${response.status}).`)
    return { providerMessageId: payload.message_uuid ?? payload.uuid ?? randomUUID(), status: 'submitted', content }
  }
}

function event(session, type, details = {}) {
  session.events.push({ id: randomUUID(), at: now(), type, ...details })
  if (session.events.length > MAX_EVENTS) session.events.splice(0, session.events.length - MAX_EVENTS)
}

function matchTrigger(triggers, text) {
  return (triggers ?? []).find((trigger) => trigger.keywords.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, trigger.caseSensitive ? '' : 'i').test(text)
  })) ?? null
}

function evaluateCondition(condition, variables) {
  const actual = variables[condition.variable]
  switch (condition.operator) {
    case 'equals': return actual === condition.value
    case 'not_equals': return actual !== condition.value
    case 'exists': return actual !== undefined && actual !== null && actual !== ''
    case 'contains': return String(actual ?? '').includes(String(condition.value ?? ''))
    case 'greater_than': return Number(actual) > Number(condition.value)
    case 'less_than': return Number(actual) < Number(condition.value)
    default: return false
  }
}

function interpolate(value, variables) {
  if (typeof value === 'string') return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => variables[key] == null ? '' : String(variables[key]))
  if (Array.isArray(value)) return value.map((item) => interpolate(item, variables))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, interpolate(entry, variables)]))
  return value
}

function interactionId(nodeId, messageIndex, kind, index) {
  return `${nodeId}:m:${messageIndex}:${kind}:${index}`
}

function createAction(action, nodeId, messageIndex, index) {
  if (action.type === 'reply') return { id: interactionId(nodeId, messageIndex, 'action', index), label: action.label, kind: 'reply', next: action.next, set: action.set }
  if (action.type === 'open_url') return { id: interactionId(nodeId, messageIndex, 'action', index), label: action.label, kind: 'open_url', url: action.url }
  throw new Error(`Unsupported Live RCS action type "${action.type}".`)
}

function collectContent(session, node, variables) {
  const content = []
  let pendingInput = null
  for (let index = 0; index < (node.messages ?? []).length; index++) {
    const message = interpolate(node.messages[index], variables)
    if (message.type === 'typing' || message.type === 'delay') continue
    if (message.sender === 'user') throw new Error('Authored user messages cannot be sent in Live RCS.')
    const previous = content.at(-1)
    if (message.type === 'text') content.push({ id: interactionId(node.id, index, 'content', 0), type: 'text', text: message.text })
    else if (message.type === 'image' || message.type === 'video') content.push({ id: interactionId(node.id, index, 'content', 0), type: message.type, url: message.url, caption: message.caption })
    else if (message.type === 'document') content.push({ id: interactionId(node.id, index, 'content', 0), type: 'file', url: message.url, filename: message.filename, title: message.title, description: message.description })
    else if (message.type === 'rich_card') content.push({ id: interactionId(node.id, index, 'content', 0), type: 'card', title: message.title, description: message.description, image: message.image, actions: (message.actions ?? []).map((action, actionIndex) => createAction(action, node.id, index, actionIndex)) })
    else if (message.type === 'carousel') content.push({ id: interactionId(node.id, index, 'content', 0), type: 'carousel', cards: message.cards.map((card) => ({ ...card, actions: (card.actions ?? []).map((action, actionIndex) => createAction(action, node.id, index, actionIndex)) })) })
    else if (message.type === 'suggested_replies') {
      if (!previous) throw new Error('Suggestions require a preceding content message.')
      previous.replies = message.options.map((choice, optionIndex) => ({ id: interactionId(node.id, index, 'reply', optionIndex), label: choice.label, kind: 'reply', next: choice.next, set: choice.set }))
    } else if (message.type === 'suggested_actions') {
      if (!previous) throw new Error('Suggestions require a preceding content message.')
      previous.actions = message.actions.map((action, actionIndex) => createAction(action, node.id, index, actionIndex))
    } else if (message.type === 'input') {
      pendingInput = { variable: message.variable, next: message.next }
    } else {
      throw new Error(`Message type "${message.type}" is not enabled for Live RCS.`)
    }
  }
  if (node.actions?.length) {
    const previous = content.at(-1)
    if (!previous) throw new Error('Node actions require a preceding content message.')
    previous.replies = node.actions.map((choice, choiceIndex) => ({ id: interactionId(node.id, node.messages?.length ?? 0, 'reply', choiceIndex), label: choice.label, kind: 'reply', next: choice.next, set: choice.set }))
  }
  return { content, pendingInput }
}

function sessionView(session) {
  const safe = { ...session }
  delete safe.flow
  delete safe.correlation
  delete safe.processedInbound
  return safe
}

export class LiveDemoService {
  constructor(config, store = new FileLiveSessionStore(config.storagePath), gateway = config.mode === 'vonage' ? new VonageRcsGateway(config) : new FakeRcsGateway()) {
    this.config = config
    this.store = store
    this.gateway = gateway
  }

  diagnostics() {
    return publicLiveDemoDiagnostics(this.config)
  }

  authorize(token) {
    return Boolean(this.config.operatorToken) && token === this.config.operatorToken
  }

  async createSession({ flow, variables = {} }) {
    if (!this.config.configured) throw new Error('Live RCS is not configured.')
    if (!flow?.metadata?.id || flow.metadata.channel !== 'rcs') throw new Error('A validated RCS flow is required.')
    if (!this.config.allowedFlowIds.includes(flow.metadata.id)) throw new Error('This flow is not allowlisted for Live RCS.')
    if (!Array.isArray(flow.nodes) || !flow.start) throw new Error('Flow is missing nodes or start state.')

    const session = {
      id: randomUUID(),
      createdAt: now(),
      updatedAt: now(),
      status: 'starting',
      recipient: maskRecipient(this.config.recipient),
      flow,
      variables: { ...(flow.variables ?? {}), ...variables },
      currentNodeId: null,
      pendingInput: null,
      correlation: {},
      processedInbound: [],
      outbound: [],
      events: [],
    }
    event(session, 'session_started', { flowId: flow.metadata.id })
    await this.enterNode(session, flow.start)
    this.store.save(session)
    return sessionView(session)
  }

  getSession(id) {
    const session = this.store.get(id)
    return session ? sessionView(session) : null
  }

  async enterNode(session, nodeId, hops = 0) {
    if (hops > MAX_AUTO_HOPS) throw new Error('Stopped after too many automatic live transitions.')
    const node = session.flow.nodes.find((candidate) => candidate.id === nodeId)
    if (!node) throw new Error(`Live flow node "${nodeId}" does not exist.`)
    session.currentNodeId = nodeId
    session.pendingInput = null
    session.variables = { ...session.variables, ...(node.set ?? {}) }
    event(session, 'node_entered', { nodeId })

    const { content, pendingInput } = collectContent(session, node, session.variables)
    for (const item of content) {
      const result = await this.gateway.send(item)
      const outbound = { id: randomUUID(), providerMessageId: result.providerMessageId, nodeId, content: item, status: result.status, at: now() }
      session.outbound.push(outbound)
      event(session, 'outbound', { outboundId: outbound.id, providerMessageId: outbound.providerMessageId, nodeId, content: item, status: result.status })
      for (const interaction of [...(item.replies ?? []), ...(item.actions ?? [])]) {
        if (interaction.kind === 'reply') session.correlation[interaction.id] = interaction
      }
    }

    if (node.condition) {
      const next = evaluateCondition(node.condition, session.variables) ? node.then : node.else
      if (!next) throw new Error(`Condition in node "${nodeId}" has no matching target.`)
      return this.enterNode(session, next, hops + 1)
    }
    if (node.next) return this.enterNode(session, node.next, hops + 1)
    if (pendingInput) {
      session.pendingInput = pendingInput
      session.status = 'awaiting_reply'
    } else if (Object.values(session.correlation).some((interaction) => interaction)) {
      session.status = 'awaiting_reply'
    } else {
      session.status = node.end ? 'completed' : 'awaiting_reply'
    }
    session.updatedAt = now()
  }

  async handleInbound(payload) {
    const eventId = payload.message_uuid ?? payload.uuid ?? payload.id
    if (!eventId) throw new Error('Inbound callback has no event identifier.')
    const postbackId = payload.reply?.id ?? payload.reply?.payload ?? payload.button?.id ?? payload.button?.payload
    const text = payload.text ?? payload.message?.text
    const session = this.store.list().find((candidate) => candidate.processedInbound.includes(eventId) || (postbackId && candidate.correlation[postbackId]) || candidate.status === 'awaiting_reply')
    if (!session) throw new Error('No active Live RCS session matches this inbound event.')
    if (session.processedInbound.includes(eventId)) return sessionView(session)
    session.processedInbound.push(eventId)

    let next
    if (postbackId && session.correlation[postbackId]) {
      const interaction = session.correlation[postbackId]
      session.variables = { ...session.variables, ...(interaction.set ?? {}) }
      next = interaction.next
      event(session, 'inbound_reply', { eventId, text: interaction.label, postbackId })
    } else if (typeof text === 'string' && text.trim()) {
      const trigger = matchTrigger(session.flow.triggers, text)
      if (trigger) {
        session.variables = { ...session.variables, ...(trigger.set ?? {}) }
        next = trigger.next
      } else if (session.pendingInput) {
        session.variables = { ...session.variables, [session.pendingInput.variable]: text }
        next = session.pendingInput.next
      }
      event(session, 'inbound_text', { eventId, text, recognized: Boolean(next) })
    } else {
      event(session, 'inbound_unsupported', { eventId, messageType: payload.message_type ?? 'unknown' })
    }
    session.correlation = {}
    if (next) await this.enterNode(session, next)
    session.updatedAt = now()
    this.store.save(session)
    return sessionView(session)
  }

  stopSession(id) {
    const session = this.store.get(id)
    if (!session) return null
    session.status = 'stopped'
    session.correlation = {}
    session.pendingInput = null
    session.updatedAt = now()
    event(session, 'session_stopped')
    this.store.save(session)
    return sessionView(session)
  }

  handleStatus(payload) {
    const providerMessageId = payload.message_uuid ?? payload.uuid ?? payload.message_id
    const status = payload.status ?? payload.message_status
    if (!providerMessageId || !status) throw new Error('Status callback has no provider message identifier or status.')
    const session = this.store.list().find((candidate) => candidate.outbound.some((outbound) => outbound.providerMessageId === providerMessageId))
    if (!session) throw new Error('No Live RCS session matches this status callback.')
    const outbound = session.outbound.find((entry) => entry.providerMessageId === providerMessageId)
    outbound.status = status
    event(session, 'status', { outboundId: outbound.id, providerMessageId, status })
    session.updatedAt = now()
    this.store.save(session)
    return sessionView(session)
  }
}

export function verifyWebhook(config, rawBody, signature) {
  if (!config.webhookSecret) return config.mode === 'fake'
  if (!signature) return false
  const expected = createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex')
  const received = signature.replace(/^sha256=/, '')
  if (received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
}

export function canReadStore(config) {
  return existsSync(config.storagePath)
}
