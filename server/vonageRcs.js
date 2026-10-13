import { createHash, createHmac, createSign, randomUUID, timingSafeEqual } from 'node:crypto'

const WEBHOOK_CLOCK_SKEW_SECONDS = 5 * 60

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function parseJsonSegment(segment) {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function webhookContext(header, claims) {
  return {
    webhookAlgorithm: header?.alg ?? null,
    webhookIssuer: claims?.iss ?? null,
    webhookApiKey: typeof claims?.api_key === 'string' ? claims.api_key : null,
    webhookApplicationId: typeof claims?.application_id === 'string' ? claims.application_id : null,
  }
}

function normalizePrivateKey(value) {
  return value?.replace(/\\n/g, '\n')
}

/** Creates a short-lived application JWT when no explicit bearer token is configured. */
export function createApplicationJwt(config, issuedAt = Math.floor(Date.now() / 1000)) {
  if (config.vonageJwt) return config.vonageJwt
  if (!config.vonagePrivateKey || !config.vonageApplicationId) {
    throw new Error('Vonage application credentials are not configured.')
  }
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    application_id: config.vonageApplicationId,
    iat: issuedAt,
    exp: issuedAt + 300,
    jti: randomUUID(),
  }))
  const signingInput = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  return `${signingInput}.${signer.sign(normalizePrivateKey(config.vonagePrivateKey)).toString('base64url')}`
}

/**
 * Verifies the HS256 JWT signed webhook used by the Vonage Messages API.
 * The payload hash is checked even over HTTPS so body parsing cannot accept a
 * token that was issued for different callback content.
 */
export function verifyVonageSignedWebhook(config, rawBody, authorization, now = Math.floor(Date.now() / 1000)) {
  if (config.mode === 'fake') return { valid: true, jti: null }
  if (config.mode !== 'vonage' || !config.vonageSignatureSecret) return { valid: false, reason: 'Signing is not configured.' }
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return { valid: false, reason: 'Missing bearer token.' }

  const token = authorization.slice(7).trim()
  const [encodedHeader, encodedClaims, encodedSignature, ...extra] = token.split('.')
  if (!encodedHeader || !encodedClaims || !encodedSignature || extra.length) return { valid: false, reason: 'Malformed bearer token.' }
  const header = parseJsonSegment(encodedHeader)
  const claims = parseJsonSegment(encodedClaims)
  if (!header || !claims || header.alg !== 'HS256' || header.typ !== 'JWT') return { valid: false, reason: 'Unsupported webhook JWT.' }
  const context = webhookContext(header, claims)

  const signatureSecret = config.vonageSignatureSecret.trim()
  const expectedSignature = createHmac('sha256', signatureSecret)
    .update(`${encodedHeader}.${encodedClaims}`)
    .digest('base64url')
  if (!safeEqual(encodedSignature, expectedSignature)) return { valid: false, reason: 'Invalid webhook signature.', ...context }
  if (claims.iss !== 'Vonage') return { valid: false, reason: 'Unexpected webhook issuer.', ...context }
  if (claims.application_id && claims.application_id !== config.vonageApplicationId) return { valid: false, reason: 'Unexpected webhook application.', ...context }
  if (!Number.isInteger(claims.iat) || claims.iat > now + WEBHOOK_CLOCK_SKEW_SECONDS || claims.iat < now - WEBHOOK_CLOCK_SKEW_SECONDS) {
    return { valid: false, reason: 'Webhook JWT is outside the allowed clock skew.', ...context }
  }
  if (!claims.jti || typeof claims.jti !== 'string') return { valid: false, reason: 'Webhook JWT has no replay identifier.', ...context }

  const payloadHash = createHash('sha256').update(rawBody).digest('hex')
  if (typeof claims.payload_hash === 'string' && !safeEqual(claims.payload_hash, payloadHash)) {
    return { valid: false, reason: 'Webhook payload hash does not match.', ...context }
  }
  return { valid: true, jti: claims.jti }
}

function baseRequest(content, config) {
  return {
    to: config.recipient,
    from: config.rcsAgentId,
    channel: 'rcs',
    client_ref: content.id,
  }
}

/**
 * RCS text fields are plain text. Keep the simulator's authoring shorthand
 * useful in the browser, but do not send its Markdown markers to the phone.
 */
function toPlainRcsText(value) {
  if (typeof value !== 'string') return value
  return value.replace(/\*\*([^*]+)\*\*|_([^_]+)_/g, (_, bold, italic) => bold ?? italic)
}

function toSuggestions(content) {
  const replies = (content.replies ?? []).map((reply) => ({
    type: 'reply',
    text: reply.label,
    postback_data: reply.id,
  }))
  const actions = (content.actions ?? []).map((action) => {
    if (action.kind === 'reply') {
      return { type: 'reply', text: action.label, postback_data: action.id }
    }
    if (action.kind === 'open_url') {
      return {
        type: 'action',
        text: action.label,
        postback_data: action.id,
        url: action.url,
      }
    }
    throw new Error(`Unsupported RCS action kind "${action.kind}".`)
  })
  return [...replies, ...actions]
}

function cardPayload(card) {
  return {
    title: card.title,
    text: toPlainRcsText(card.description),
    ...(card.imageUrl ? { media_url: card.imageUrl, media_height: 'MEDIUM', media_description: card.title } : {}),
    ...(card.actions?.length ? { suggestions: toSuggestions({ actions: card.actions }) } : {}),
  }
}

/** Maps the app's provider-neutral live content into Messages API RCS payloads. */
export function toVonageRcsMessage(content, config) {
  const request = baseRequest(content, config)
  const suggestions = toSuggestions(content)
  switch (content.type) {
    case 'text':
      return { ...request, message_type: 'text', text: toPlainRcsText(content.text), ...(suggestions.length ? { suggestions } : {}) }
    case 'image':
      if (suggestions.length) throw new Error('RCS image suggestions require an agent-specific custom mapping.')
      return { ...request, message_type: 'image', image: { url: content.url, ...(content.text ? { caption: toPlainRcsText(content.text) } : {}) } }
    case 'video':
      if (suggestions.length) throw new Error('RCS video suggestions require an agent-specific custom mapping.')
      return { ...request, message_type: 'video', video: { url: content.url, ...(content.text ? { caption: toPlainRcsText(content.text) } : {}) } }
    case 'file':
      if (suggestions.length) throw new Error('RCS file suggestions require an agent-specific custom mapping.')
      return { ...request, message_type: 'file', file: { url: content.url } }
    case 'card':
      return {
        ...request,
        message_type: 'card',
        card: {
          title: content.title,
          text: toPlainRcsText(content.description),
          ...(content.url ? { media_url: content.url, media_height: 'MEDIUM', media_description: content.title } : {}),
          ...(suggestions.length ? { suggestions } : {}),
        },
        rcs: { card_orientation: 'VERTICAL' },
      }
    case 'carousel':
      return {
        ...request,
        message_type: 'carousel',
        carousel: { cards: content.cards.map(cardPayload) },
        rcs: { card_width: 'MEDIUM' },
      }
    default:
      throw new Error(`Unsupported Live RCS content type "${content.type}".`)
  }
}
