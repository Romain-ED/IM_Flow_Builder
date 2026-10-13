import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createApplicationJwt, toVonageRcsMessage, verifyVonageSignedWebhook } from './vonageRcs.js'

const MAX_AUTO_HOPS = 50
const MAX_EVENTS = 500
const MAX_TIMELINE = 500
const LIVE_SCHEMA_VERSION = 1
const PROVIDER_STATUSES = new Set(['submitted', 'delivered', 'read', 'rejected', 'undeliverable', 'failed', 'updated'])

function enabled(value) {
  return value === 'true' || value === '1'
}

export function getLiveDemoConfig(env = process.env, projectRoot = process.cwd()) {
  const mode = ['disabled', 'fake', 'vonage'].includes(env.LIVE_RCS_MODE) ? env.LIVE_RCS_MODE : 'disabled'
  const allowedFlowIds = (env.LIVE_RCS_ALLOWED_FLOW_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  const storageDurable = enabled(env.LIVE_RCS_STORAGE_DURABLE)
  const demoEphemeralStorage = enabled(env.LIVE_RCS_DEMO_EPHEMERAL_STORAGE)
  const errors = []
  if (mode !== 'disabled' && !env.LIVE_RCS_TEST_RECIPIENT) errors.push('LIVE_RCS_TEST_RECIPIENT is required.')
  if (mode !== 'disabled' && !env.LIVE_RCS_OPERATOR_TOKEN) errors.push('LIVE_RCS_OPERATOR_TOKEN is required.')
  if (mode !== 'disabled' && allowedFlowIds.length === 0) errors.push('LIVE_RCS_ALLOWED_FLOW_IDS is required.')
  if (mode === 'vonage') {
    if (!env.LIVE_RCS_RCS_AGENT_ID) errors.push('LIVE_RCS_RCS_AGENT_ID is required for Vonage mode.')
    if (!env.LIVE_RCS_VONAGE_APPLICATION_ID) errors.push('LIVE_RCS_VONAGE_APPLICATION_ID is required for Vonage mode.')
    if (!env.LIVE_RCS_VONAGE_SIGNATURE_SECRET) errors.push('LIVE_RCS_VONAGE_SIGNATURE_SECRET is required for Vonage mode.')
    if (!env.LIVE_RCS_VONAGE_JWT && !env.LIVE_RCS_VONAGE_PRIVATE_KEY) {
      errors.push('LIVE_RCS_VONAGE_JWT or LIVE_RCS_VONAGE_PRIVATE_KEY is required for Vonage mode.')
    }
    if (!storageDurable && !demoEphemeralStorage) {
      errors.push('LIVE_RCS_STORAGE_DURABLE=true or LIVE_RCS_DEMO_EPHEMERAL_STORAGE=true is required for Vonage mode.')
    }
  }

  return {
    mode,
    configured: mode !== 'disabled' && errors.length === 0,
    errors,
    recipient: env.LIVE_RCS_TEST_RECIPIENT ?? null,
    allowedFlowIds,
    operatorToken: env.LIVE_RCS_OPERATOR_TOKEN ?? '',
    vonageJwt: env.LIVE_RCS_VONAGE_JWT ?? '',
    vonagePrivateKey: env.LIVE_RCS_VONAGE_PRIVATE_KEY ?? '',
    vonageApplicationId: env.LIVE_RCS_VONAGE_APPLICATION_ID ?? '',
    vonageSignatureSecret: env.LIVE_RCS_VONAGE_SIGNATURE_SECRET ?? '',
    rcsAgentId: env.LIVE_RCS_RCS_AGENT_ID ?? '',
    vonageApiUrl: env.LIVE_RCS_VONAGE_API_URL ?? 'https://api-eu.vonage.com/v1/messages',
    storagePath: resolve(env.LIVE_RCS_STORE_PATH ?? resolve(projectRoot, '.live-rcs-sessions.json')),
    storageDurable,
    demoEphemeralStorage,
  }
}

export function publicLiveDemoDiagnostics(config) {
  return {
    mode: config.mode,
    ready: config.configured,
    recipient: config.recipient ? maskRecipient(config.recipient) : null,
    allowedFlowIds: config.allowedFlowIds,
    storage: config.mode === 'vonage'
      ? config.storageDurable
        ? 'durable'
        : config.demoEphemeralStorage
          ? 'single-instance demo — sessions are lost on restart'
          : 'not configured'
      : 'development file store',
    errors: config.errors,
  }
}

function maskRecipient(value) {
  return value.length <= 4 ? '••••' : `${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`
}

function normalizedAddress(value) {
  const normalized = String(value ?? '').replace(/[\s-]/g, '')
  return /^\+?\d+$/.test(normalized) ? normalized.replace(/^\+/, '') : normalized
}

function assertVonageInboundIdentity(config, payload) {
  if (config.mode !== 'vonage') return
  if (payload.channel !== 'rcs') throw new Error('Webhook channel is not RCS.')
  if (normalizedAddress(payload.from) !== normalizedAddress(config.recipient)) {
    throw new Error('Inbound webhook sender does not match the configured test recipient.')
  }
  if (normalizedAddress(payload.to) !== normalizedAddress(config.rcsAgentId)) {
    throw new Error('Inbound webhook destination does not match the configured RCS agent.')
  }
}

function assertVonageStatusIdentity(config, payload) {
  if (config.mode !== 'vonage') return
  if (payload.channel !== 'rcs') throw new Error('Webhook channel is not RCS.')
  if (normalizedAddress(payload.to) !== normalizedAddress(config.recipient)) {
    throw new Error('Status webhook destination does not match the configured test recipient.')
  }
  if (normalizedAddress(payload.from) !== normalizedAddress(config.rcsAgentId)) {
    throw new Error('Status webhook sender does not match the configured RCS agent.')
  }
}

function now() {
  return new Date().toISOString()
}

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sessions)) return { sessions: [] }
  return {
    sessions: raw.sessions.map((session) => ({
      ...session,
      timeline: Array.isArray(session.timeline) ? session.timeline : [],
      nextTimelineOrdinal: Number.isInteger(session.nextTimelineOrdinal)
        ? session.nextTimelineOrdinal
        : Array.isArray(session.timeline) ? session.timeline.reduce((max, item) => Math.max(max, Number(item.ordinal) || 0), 0) + 1 : 1,
      timelineTruncated: Boolean(session.timelineTruncated),
      pendingInput: session.pendingInput
        ? { ...session.pendingInput, inputType: session.pendingInput.inputType ?? 'text' }
        : null,
      provider: session.provider && typeof session.provider === 'object'
        ? session.provider
        : { latestStatus: null, updatedAt: null },
      activity: session.activity && typeof session.activity === 'object'
        ? session.activity
        : { latestInbound: null, latestOutbound: null, latestProvider: null },
    })),
  }
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

function providerErrorDetail(payload) {
  if (!payload || typeof payload !== 'object') return ''
  const detail = payload.detail ?? payload.message ?? payload.error ?? payload.title
  if (typeof detail === 'string') return detail.slice(0, 500)
  try {
    return JSON.stringify(payload).slice(0, 500)
  } catch {
    return ''
  }
}

export class VonageRcsGateway {
  constructor(config, fetchImpl = fetch) {
    this.config = config
    this.fetch = fetchImpl
  }

  async send(content) {
    const response = await this.fetch(this.config.vonageApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${createApplicationJwt(this.config)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toVonageRcsMessage(content, this.config)),
      signal: AbortSignal.timeout(10_000),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const detail = providerErrorDetail(payload)
      throw new Error(`Vonage Messages API rejected the message (${response.status})${detail ? `: ${detail}` : '.'}`)
    }
    return { providerMessageId: payload.message_uuid ?? payload.uuid ?? randomUUID(), status: 'submitted', content }
  }
}

function event(session, type, details = {}) {
  session.events.push({ id: randomUUID(), at: now(), type, ...details })
  if (session.events.length > MAX_EVENTS) session.events.splice(0, session.events.length - MAX_EVENTS)
}

function boundedText(value, limit = 1000) {
  if (typeof value !== 'string') return ''
  const cleaned = Array.from(value).filter((character) => {
    const code = character.codePointAt(0) ?? 0
    return code !== 127 && (code >= 32 || code === 9 || code === 10 || code === 13)
  }).join('')
  const chars = Array.from(cleaned)
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : cleaned
}

function isSensitiveKey(key) {
  return /(password|secret|token|credential|auth|otp|pin|verification|code)/i.test(key)
}

function presenterVariables(session) {
  const allowed = new Set(session.flow?.metadata?.livePublicVariables ?? [])
  return Object.fromEntries(Object.entries(session.variables ?? {}).filter(([key, value]) => {
    if (!allowed.has(key) || isSensitiveKey(key)) return false
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  }).map(([key, value]) => [key, typeof value === 'string' ? boundedText(value, 256) : value]))
}

function presenterText(session, value) {
  let text = boundedText(value)
  for (const [key, value] of Object.entries(session.variables ?? {})) {
    if (isSensitiveKey(key) || !new Set(session.flow?.metadata?.livePublicVariables ?? []).has(key)) {
      if (value !== null && value !== undefined && String(value)) text = text.split(String(value)).join('[hidden]')
    }
  }
  if (/Bearer\s+[A-Za-z0-9._~-]+|-----BEGIN [A-Z ]+-----|(?:token|secret|password|private[_ -]?key)\s*[:=]\s*[^\s]+/i.test(text)) return '[redacted]'
  return text
}

function presenterUrl(value) {
  if (typeof value !== 'string' || !value) return ''
  if (/Bearer\s+|eyJ[A-Za-z0-9_-]+\.|-----BEGIN [A-Z ]+-----/i.test(value)) return ''
  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (/(token|secret|sig|signature|key|auth|credential)/i.test(key)) url.searchParams.delete(key)
    }
    url.username = ''
    url.password = ''
    return boundedText(url.toString(), 1000)
  } catch {
    return ''
  }
}

function displayAction(action) {
  if (!action || typeof action !== 'object' || typeof action.label !== 'string') return null
  if (action.kind === 'reply' || action.type === 'reply') return { type: 'reply', label: boundedText(action.label, 160) }
  return { type: 'display_only', label: boundedText(action.label, 160) }
}

function liveMessageFromContent(content, sender, session) {
  const base = { sender }
  if (!content || typeof content !== 'object') return null
  if (content.type === 'text') return { type: 'text', ...base, text: presenterText(session, content.text) }
  if (content.type === 'image' || content.type === 'video') return {
    type: content.type,
    ...base,
    url: presenterUrl(content.url),
    ...(content.text ? { caption: presenterText(session, content.text) } : {}),
  }
  if (content.type === 'file' || content.type === 'document') return {
    type: 'document',
    ...base,
    url: presenterUrl(content.url),
    filename: presenterText(session, content.filename),
    ...(content.title ? { title: presenterText(session, content.title) } : {}),
    ...(content.description ? { description: presenterText(session, content.description) } : {}),
  }
  if (content.type === 'card' || content.type === 'rich_card') return {
    type: 'rich_card',
    ...base,
    ...(content.url ? { image: presenterUrl(content.url) } : {}),
    title: presenterText(session, content.title),
    ...(content.description ? { description: presenterText(session, content.description) } : {}),
    ...(Array.isArray(content.actions) ? { actions: content.actions.map(displayAction).filter(Boolean) } : {}),
  }
  if (content.type === 'carousel' && Array.isArray(content.cards)) return {
    type: 'carousel',
    ...base,
    cards: content.cards.map((card) => ({
      id: boundedText(card.id, 160),
      ...(card.imageUrl || card.image ? { image: presenterUrl(card.imageUrl ?? card.image) } : {}),
      title: presenterText(session, card.title),
      ...(card.description ? { description: presenterText(session, card.description) } : {}),
      ...(card.subtitle ? { subtitle: presenterText(session, card.subtitle) } : {}),
      ...(card.price ? { price: presenterText(session, card.price) } : {}),
      ...(Array.isArray(card.actions) ? { actions: card.actions.map(displayAction).filter(Boolean) } : {}),
    })),
  }
  return null
}

function previewForMessage(message) {
  if (!message) return ''
  if (message.type === 'text') return message.text
  if (message.type === 'document') return message.title ?? message.filename
  if (message.type === 'rich_card') return message.title
  if (message.type === 'carousel') return message.cards?.[0]?.title ?? 'Carousel'
  return message.type
}

function appendTimeline(session, { sender, nodeId, message, at = now() }) {
  if (!message) return null
  const item = {
    id: randomUUID(),
    ordinal: session.nextTimelineOrdinal ?? 1,
    at,
    nodeId: nodeId ?? null,
    sender,
    message,
  }
  session.nextTimelineOrdinal = item.ordinal + 1
  session.timeline ??= []
  session.timeline.push(item)
  if (session.timeline.length > MAX_TIMELINE) {
    session.timeline.splice(0, session.timeline.length - MAX_TIMELINE)
    session.timelineTruncated = true
  }
  const activity = { at: item.at, nodeId: item.nodeId, preview: boundedText(previewForMessage(message), 240) }
  if (sender === 'user') session.activity.latestInbound = { ...activity, kind: 'inbound' }
  else session.activity.latestOutbound = { ...activity, kind: 'outbound' }
  session.updatedAt = item.at
  return item
}

function normalizedProviderStatus(value) {
  const status = String(value ?? '').toLowerCase()
  return PROVIDER_STATUSES.has(status) ? status : 'updated'
}

function presenterSnapshot(session) {
  return {
    schemaVersion: LIVE_SCHEMA_VERSION,
    id: session.id,
    status: session.status,
    recipient: session.recipient,
    currentNodeId: session.currentNodeId ?? null,
    pendingInput: session.pendingInput ? { nodeId: session.pendingInput.nodeId, inputType: session.pendingInput.inputType } : null,
    variables: presenterVariables(session),
    timeline: (session.timeline ?? []).map((item) => ({ ...item, message: { ...item.message } })),
    timelineTruncated: Boolean(session.timelineTruncated),
    activity: session.activity ?? { latestInbound: null, latestOutbound: null, latestProvider: null },
    provider: session.provider ?? { latestStatus: null, updatedAt: null },
    updatedAt: session.updatedAt,
  }
}

function safeDiagnostic(entry, index) {
  return {
    id: String(index + 1),
    at: entry.at,
    type: entry.type,
    ...(entry.nodeId ? { nodeId: entry.nodeId } : {}),
    ...(entry.status ? { status: normalizedProviderStatus(entry.status) } : {}),
    ...(typeof entry.recognized === 'boolean' ? { recognized: entry.recognized } : {}),
    ...(entry.messageType ? { messageType: boundedText(entry.messageType, 80) } : {}),
    ...(entry.error ? { safeCode: 'WEBHOOK_PROCESSING_ERROR' } : {}),
  }
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

function resolveMediaUrl(source, publicBaseUrl) {
  if (!source || !publicBaseUrl) return source
  try {
    return new URL(source, publicBaseUrl).toString()
  } catch {
    return source
  }
}

function interactionId(nodeId, messageIndex, kind, index) {
  return `${nodeId}:m:${messageIndex}:${kind}:${index}`
}

function createAction(action, nodeId, messageIndex, index) {
  if (action.type === 'reply') return { id: interactionId(nodeId, messageIndex, 'action', index), label: action.label, kind: 'reply', next: action.next, set: action.set }
  if (action.type === 'open_url') return { id: interactionId(nodeId, messageIndex, 'action', index), label: action.label, kind: 'open_url', url: action.url }
  throw new Error(`Unsupported Live RCS action type "${action.type}".`)
}

function inboundPostbackId(payload) {
  const source = payload ?? {}
  const candidates = [
    source.reply?.id,
    source.reply?.postback_data,
    source.reply?.postbackData,
    source.reply?.payload,
    source.reply?.data?.id,
    source.reply?.data?.postback_data,
    source.reply?.data?.postbackData,
    source.button?.id,
    source.button?.postback_data,
    source.button?.postbackData,
    source.button?.payload,
    source.button?.data?.id,
    source.button?.data?.postback_data,
    source.button?.data?.postbackData,
    source.postback_data,
    source.postbackData,
    source.data?.postback_data,
    source.data?.postbackData,
  ]
  return candidates.find((value) => typeof value === 'string' && value) ?? null
}

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort() : []
}

export function summarizeInboundPayload(payload) {
  const source = payload ?? {}
  const text = source.text ?? source.message?.text
  return {
    eventId: source.message_uuid ?? source.uuid ?? source.id ?? null,
    channel: source.channel ?? null,
    messageType: source.message_type ?? null,
    from: source.from ? maskRecipient(String(source.from)) : null,
    to: source.to ? maskRecipient(String(source.to)) : null,
    topLevelKeys: objectKeys(source),
    replyKeys: objectKeys(source.reply),
    buttonKeys: objectKeys(source.button),
    messageKeys: objectKeys(source.message),
    dataKeys: objectKeys(source.data),
    postbackId: inboundPostbackId(source),
    textLength: typeof text === 'string' ? text.length : null,
  }
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
    else if (message.type === 'image' || message.type === 'video') content.push({ id: interactionId(node.id, index, 'content', 0), type: message.type, url: resolveMediaUrl(message.url, session.publicBaseUrl), text: message.caption })
    else if (message.type === 'document') content.push({ id: interactionId(node.id, index, 'content', 0), type: 'file', url: resolveMediaUrl(message.url, session.publicBaseUrl), filename: message.filename, title: message.title, description: message.description })
    else if (message.type === 'rich_card') content.push({ id: interactionId(node.id, index, 'content', 0), type: 'card', title: message.title, description: message.description, url: resolveMediaUrl(message.image, session.publicBaseUrl), actions: (message.actions ?? []).map((action, actionIndex) => createAction(action, node.id, index, actionIndex)) })
    else if (message.type === 'carousel') content.push({ id: interactionId(node.id, index, 'content', 0), type: 'carousel', cards: message.cards.map((card, cardIndex) => ({ id: card.id, title: card.title, description: card.description ?? card.subtitle, imageUrl: resolveMediaUrl(card.image, session.publicBaseUrl), actions: (card.actions ?? []).map((action, actionIndex) => createAction(action, node.id, index, cardIndex * 10 + actionIndex)) })) })
    else if (message.type === 'suggested_replies') {
      if (!previous) throw new Error('Suggestions require a preceding content message.')
      previous.replies = message.options.map((choice, optionIndex) => ({ id: interactionId(node.id, index, 'reply', optionIndex), label: choice.label, kind: 'reply', next: choice.next, set: choice.set }))
    } else if (message.type === 'suggested_actions') {
      if (!previous) throw new Error('Suggestions require a preceding content message.')
      previous.actions = message.actions.map((action, actionIndex) => createAction(action, node.id, index, actionIndex))
    } else if (message.type === 'input') {
      pendingInput = { variable: message.variable, next: message.next, inputType: message.inputType }
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

function sessionDiagnosticsView(session) {
  return {
    id: session.id,
    status: session.status,
    recipient: session.recipient,
    currentNodeId: session.currentNodeId ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    outboundCount: session.outbound?.length ?? 0,
    eventCount: session.events?.length ?? 0,
  }
}

export class LiveDemoService {
  constructor(config, store = new FileLiveSessionStore(config.storagePath), gateway = config.mode === 'vonage' ? new VonageRcsGateway(config) : new FakeRcsGateway()) {
    this.config = config
    this.store = store
    this.gateway = gateway
    this.webhookReplayIds = new Map()
    this.diagnosticEvents = []
  }

  diagnostics() {
    return publicLiveDemoDiagnostics(this.config)
  }

  recordDiagnostic(details) {
    this.diagnosticEvents ??= []
    this.diagnosticEvents.push({ id: randomUUID(), at: now(), ...details })
    if (this.diagnosticEvents.length > MAX_EVENTS) this.diagnosticEvents.splice(0, this.diagnosticEvents.length - MAX_EVENTS)
  }

  listSessions() {
    return this.store.list()
      .map((session) => presenterSnapshot(session))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  }

  diagnosticsLog(sessionId) {
    const session = sessionId ? this.store.get(sessionId) : null
    return {
      generatedAt: now(),
      session: session ? sessionDiagnosticsView(session) : null,
      diagnostics: (this.diagnosticEvents ?? []).map(safeDiagnostic),
    }
  }

  claimWebhookReplayId(jti) {
    if (!jti) return true
    const nowMs = Date.now()
    for (const [key, expiresAt] of this.webhookReplayIds) {
      if (expiresAt <= nowMs) this.webhookReplayIds.delete(key)
    }
    if (this.webhookReplayIds.has(jti)) return false
    this.webhookReplayIds.set(jti, nowMs + 5 * 60 * 1000)
    return true
  }

  authorize(token) {
    return Boolean(this.config.operatorToken) && token === this.config.operatorToken
  }

  async createSession({ flow, variables = {}, publicBaseUrl }) {
    if (!this.config.configured) throw new Error('Live RCS is not configured.')
    if (!flow?.metadata?.id || flow.metadata.channel !== 'rcs') throw new Error('A validated RCS flow is required.')
    if (!this.config.allowedFlowIds.includes(flow.metadata.id)) throw new Error('This flow is not allowlisted for Live RCS.')
    if (!Array.isArray(flow.nodes) || !flow.start) throw new Error('Flow is missing nodes or start state.')
    if (this.store.list().some((session) => session.status === 'starting' || session.status === 'awaiting_reply')) {
      throw new Error('A Live RCS session is already active for the fixed test recipient.')
    }

    const session = {
      id: randomUUID(),
      createdAt: now(),
      updatedAt: now(),
      status: 'starting',
      recipient: maskRecipient(this.config.recipient),
      publicBaseUrl,
      flow,
      variables: { ...(flow.variables ?? {}), ...variables },
      initialVariables: { ...(flow.variables ?? {}), ...variables },
      currentNodeId: null,
      pendingInput: null,
      correlation: {},
      processedInbound: [],
      outbound: [],
      events: [],
      timeline: [],
      nextTimelineOrdinal: 1,
      timelineTruncated: false,
      activity: { latestInbound: null, latestOutbound: null, latestProvider: null },
      provider: { latestStatus: null, updatedAt: null },
    }
    event(session, 'session_started', { flowId: flow.metadata.id })
    this.store.save(session)
    try {
      await this.enterNode(session, flow.start)
    } catch (error) {
      session.status = 'error'
      session.updatedAt = now()
      event(session, 'delivery_failed', { safeCode: 'DELIVERY_FAILED' })
      this.store.save(session)
      if (error && typeof error === 'object') error.liveSnapshot = presenterSnapshot(session)
      throw error
    }
    this.store.save(session)
    return presenterSnapshot(session)
  }

  getSession(id) {
    const session = this.store.get(id)
    return session ? presenterSnapshot(session) : null
  }

  async restartSession(id) {
    const session = this.store.get(id)
    if (!session) return null
    if (session.status === 'starting') throw new Error('Live session is already starting.')
    if (session.status === 'stopped') throw new Error('Cannot restart a stopped Live RCS session.')

    session.status = 'starting'
    session.currentNodeId = null
    session.pendingInput = null
    session.correlation = {}
    session.processedInbound = []
    session.outbound = []
    session.events = []
    session.timeline = []
    session.nextTimelineOrdinal = 1
    session.timelineTruncated = false
    session.activity = { latestInbound: null, latestOutbound: null, latestProvider: null }
    session.provider = { latestStatus: null, updatedAt: null }
    session.variables = { ...(session.initialVariables ?? session.flow.variables ?? {}) }
    event(session, 'session_restarted')
    this.store.save(session)
    try {
      await this.enterNode(session, session.flow.start)
    } catch (error) {
      session.status = 'error'
      session.updatedAt = now()
      event(session, 'delivery_failed', { safeCode: 'DELIVERY_FAILED' })
      this.store.save(session)
      if (error && typeof error === 'object') error.liveSnapshot = presenterSnapshot(session)
      throw error
    }
    this.store.save(session)
    return presenterSnapshot(session)
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
      appendTimeline(session, { sender: 'business', nodeId, message: liveMessageFromContent(item, 'business', session), at: outbound.at })
      event(session, 'outbound', { outboundId: outbound.id, providerMessageId: outbound.providerMessageId, nodeId, content: item, status: result.status })
      const interactions = [
        ...(item.replies ?? []),
        ...(item.actions ?? []),
        ...(item.type === 'carousel' ? item.cards.flatMap((card) => card.actions ?? []) : []),
      ]
      for (const interaction of interactions) {
        if (interaction.kind === 'reply') session.correlation[interaction.id] = interaction
      }
      this.store.save(session)
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
    const payloadSummary = summarizeInboundPayload(payload)
    this.recordDiagnostic({ type: 'inbound_received', ...payloadSummary })
    try {
      assertVonageInboundIdentity(this.config, payload)
    } catch (error) {
      this.recordDiagnostic({ type: 'inbound_rejected', eventId: payloadSummary.eventId, error: error instanceof Error ? error.message : 'Identity validation failed.' })
      throw error
    }
    const eventId = payloadSummary.eventId
    if (!eventId) throw new Error('Inbound callback has no event identifier.')
    const postbackId = payloadSummary.postbackId
    const text = payload.text ?? payload.message?.text
    const session = this.store.list().find((candidate) => candidate.processedInbound.includes(eventId) || (postbackId && candidate.correlation[postbackId]) || candidate.status === 'awaiting_reply')
    if (!session) {
      this.recordDiagnostic({ type: 'inbound_unmatched_session', eventId, postbackId })
      throw new Error('No active Live RCS session matches this inbound event.')
    }
    if (session.processedInbound.includes(eventId)) {
      this.recordDiagnostic({ type: 'inbound_duplicate', sessionId: session.id, eventId, postbackId })
      return presenterSnapshot(session)
    }

    let next
    let recognized = false
    let recognizedReplyLabel = null
    if (postbackId && session.correlation[postbackId]) {
      const interaction = session.correlation[postbackId]
      recognizedReplyLabel = interaction.label
      session.variables = { ...session.variables, ...(interaction.set ?? {}) }
      next = interaction.next
      recognized = true
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
      recognized = Boolean(next)
      event(session, 'inbound_text', { eventId, text, recognized })
    } else {
      event(session, 'inbound_unsupported', { eventId, messageType: payload.message_type ?? 'unknown' })
    }
    if (!recognized) {
      this.recordDiagnostic({ type: 'inbound_unmatched', sessionId: session.id, eventId, postbackId, reason: postbackId ? 'No matching interaction correlation.' : 'No supported text or reply interaction found.' })
      session.updatedAt = now()
      this.store.save(session)
      return presenterSnapshot(session)
    }
    session.processedInbound.push(eventId)
    session.correlation = {}
    const inboundText = recognizedReplyLabel ?? text.trim()
    appendTimeline(session, {
      sender: 'user',
      nodeId: session.currentNodeId,
      message: liveMessageFromContent({ type: 'text', text: inboundText }, 'user', session),
    })
    this.recordDiagnostic({ sessionId: session.id, type: 'inbound_routed', eventId, postbackId, nextNodeId: next ?? null })
    if (next) await this.enterNode(session, next)
    session.updatedAt = now()
    this.store.save(session)
    return presenterSnapshot(session)
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
    return presenterSnapshot(session)
  }

  handleStatus(payload) {
    assertVonageStatusIdentity(this.config, payload)
    const providerMessageId = payload.message_uuid ?? payload.uuid ?? payload.message_id
    const status = payload.status ?? payload.message_status
    if (!providerMessageId || !status) throw new Error('Status callback has no provider message identifier or status.')
    const session = this.store.list().find((candidate) => candidate.outbound.some((outbound) => outbound.providerMessageId === providerMessageId))
    if (!session) throw new Error('No Live RCS session matches this status callback.')
    const outbound = session.outbound.find((entry) => entry.providerMessageId === providerMessageId)
    const normalizedStatus = normalizedProviderStatus(status)
    outbound.status = normalizedStatus
    const updatedAt = now()
    session.provider = { latestStatus: normalizedStatus, updatedAt }
    session.activity.latestProvider = { at: updatedAt, nodeId: outbound.nodeId ?? null, preview: `Provider status: ${normalizedStatus}`, kind: 'provider' }
    event(session, 'status', { outboundId: outbound.id, providerMessageId, status: normalizedStatus })
    session.updatedAt = updatedAt
    this.store.save(session)
    return presenterSnapshot(session)
  }
}

export function verifyWebhook(config, rawBody, authorization) {
  return verifyVonageSignedWebhook(config, rawBody, authorization)
}

export function canReadStore(config) {
  return existsSync(config.storagePath)
}
