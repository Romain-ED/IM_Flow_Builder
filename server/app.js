import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLiveDemoConfig, LiveDemoService, summarizeInboundPayload, verifyWebhook } from './liveDemo.js'
import { createShareLinks } from './shareLinks.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = join(projectRoot, 'dist')
const MAX_BODY_BYTES = 100_000

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function isInsideDist(filePath) {
  const pathFromDist = relative(distDirectory, filePath)
  return pathFromDist === '' || (!pathFromDist.startsWith('..') && !isAbsolute(pathFromDist))
}

function send(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, { 'Content-Type': contentType, 'Cache-Control': 'no-store' })
  response.end(body)
}

function sendJson(response, statusCode, body) {
  send(response, statusCode, JSON.stringify(body), 'application/json; charset=utf-8')
}

function sendFile(request, response, filePath) {
  let stats
  try {
    stats = statSync(filePath)
  } catch {
    return false
  }
  if (!stats.isFile() || !isInsideDist(filePath)) return false
  const extension = extname(filePath).toLowerCase()
  response.writeHead(200, {
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    'Content-Length': stats.size,
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
  })
  if (request.method === 'HEAD') response.end()
  else createReadStream(filePath).pipe(response)
  return true
}

function requestedFile(pathname) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const filePath = resolve(distDirectory, decodedPath.replace(/^\/+/, ''))
  return isInsideDist(filePath) ? filePath : null
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    let length = 0
    request.on('data', (chunk) => {
      length += chunk.length
      if (length > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolveBody(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

function readJson(rawBody) {
  try {
    return JSON.parse(rawBody.toString('utf8'))
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

function bearerToken(request) {
  const header = request.headers.authorization
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : ''
}

function errorEnvelope(code, message) {
  return { error: { code, message } }
}

function apiError(response, error) {
  const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.'
  const code = rawMessage.includes('not configured') ? 'LIVE_NOT_CONFIGURED'
    : rawMessage.includes('allowlisted') || rawMessage.includes('required') ? 'LIVE_INVALID_REQUEST'
      : rawMessage.includes('already active') || rawMessage.includes('already starting') ? 'LIVE_CONFLICT'
        : rawMessage.includes('not found') || rawMessage.includes('No Live RCS session') || rawMessage.includes('No active Live RCS session') ? 'SESSION_NOT_FOUND'
          : rawMessage.includes('Vonage') ? 'DELIVERY_FAILED'
            : 'LIVE_INVALID_REQUEST'
  const status = code === 'LIVE_NOT_CONFIGURED' ? 503 : code === 'LIVE_CONFLICT' ? 409 : code === 'SESSION_NOT_FOUND' ? 404 : code === 'DELIVERY_FAILED' ? 502 : 422
  const messages = {
    LIVE_NOT_CONFIGURED: 'Live RCS is not configured.',
    LIVE_INVALID_REQUEST: 'The live RCS request is invalid.',
    LIVE_CONFLICT: 'A live RCS session is already active.',
    SESSION_NOT_FOUND: 'Live session not found.',
    DELIVERY_FAILED: 'Live message delivery failed.',
  }
  const body = { ...errorEnvelope(code, messages[code]), ...(error?.liveSnapshot ? { id: error.liveSnapshot.id, liveSnapshot: error.liveSnapshot } : {}) }
  sendJson(response, status, body)
}

function requestOrigin(request) {
  if (typeof request.headers.origin === 'string' && request.headers.origin) return request.headers.origin
  const protocol = typeof request.headers['x-forwarded-proto'] === 'string' ? request.headers['x-forwarded-proto'].split(',')[0].trim() : 'http'
  return `${protocol}://${request.headers.host ?? 'localhost'}`
}

async function handleApi(request, response, url, liveDemo) {
  if (request.method === 'GET' && url.pathname === '/api/live/diagnostics') {
    sendJson(response, 200, liveDemo.diagnostics())
    return true
  }
  if (!liveDemo.authorize(bearerToken(request))) {
    sendJson(response, 401, errorEnvelope('UNAUTHORIZED', 'Unauthorized.'))
    return true
  }
  try {
    if (request.method === 'POST' && url.pathname === '/api/live/sessions') {
      const body = readJson(await readBody(request))
      const session = await liveDemo.createSession({ ...body, publicBaseUrl: requestOrigin(request) })
      sendJson(response, 201, session)
      return true
    }
    if (request.method === 'GET' && url.pathname === '/api/live/sessions') {
      sendJson(response, 200, liveDemo.listSessions())
      return true
    }
    if (request.method === 'GET' && url.pathname === '/api/live/logs') {
      sendJson(response, 200, liveDemo.diagnosticsLog(url.searchParams.get('sessionId') ?? undefined))
      return true
    }
    const restartMatch = url.pathname.match(/^\/api\/live\/sessions\/([\w-]+)\/restart$/)
    if (request.method === 'POST' && restartMatch) {
      const session = await liveDemo.restartSession(restartMatch[1])
      if (!session) sendJson(response, 404, errorEnvelope('SESSION_NOT_FOUND', 'Live session not found.'))
      else sendJson(response, 200, session)
      return true
    }
    const stopMatch = url.pathname.match(/^\/api\/live\/sessions\/([\w-]+)\/stop$/)
    if (request.method === 'POST' && stopMatch) {
      const session = liveDemo.stopSession(stopMatch[1])
      if (!session) sendJson(response, 404, errorEnvelope('SESSION_NOT_FOUND', 'Live session not found.'))
      else sendJson(response, 200, session)
      return true
    }
    const sessionMatch = url.pathname.match(/^\/api\/live\/sessions\/([\w-]+)$/)
    if (request.method === 'GET' && sessionMatch) {
      const session = liveDemo.getSession(sessionMatch[1])
      if (!session) {
        sendJson(response, 404, { error: 'Live session not found.' })
      } else {
        sendJson(response, 200, session)
      }
      return true
    }
  } catch (error) {
    apiError(response, error)
    return true
  }
  return false
}

async function handleWebhook(request, response, url, liveDemo) {
  if (request.method !== 'POST' || !url.pathname.startsWith('/webhooks/vonage/')) return false
  let payload = null
  try {
    const rawBody = await readBody(request)
    const verification = verifyWebhook(liveDemo.config, rawBody, request.headers.authorization)
    if (!verification.valid) {
      liveDemo.recordDiagnostic({
        type: 'webhook_rejected',
        route: url.pathname,
        reason: verification.reason ?? 'Webhook signature verification failed.',
        ...(verification.webhookApiKey ? { webhookApiKey: verification.webhookApiKey } : {}),
        ...(verification.webhookApplicationId ? { webhookApplicationId: verification.webhookApplicationId } : {}),
        ...(verification.webhookAlgorithm ? { webhookAlgorithm: verification.webhookAlgorithm } : {}),
      })
      sendJson(response, 401, { error: 'Webhook signature verification failed.' })
      return true
    }
    if (!liveDemo.claimWebhookReplayId(verification.jti)) {
      liveDemo.recordDiagnostic({ type: 'webhook_duplicate', route: url.pathname, replayIdPresent: Boolean(verification.jti) })
      sendJson(response, 202, { accepted: true, duplicate: true })
      return true
    }
    payload = readJson(rawBody)
    liveDemo.recordDiagnostic({ type: 'webhook_received', route: url.pathname, ...summarizeInboundPayload(payload) })
    let result
    if (url.pathname === '/webhooks/vonage/inbound') {
      result = await liveDemo.handleInbound(payload)
    } else if (url.pathname === '/webhooks/vonage/status') {
      result = liveDemo.handleStatus(payload)
    } else {
      liveDemo.recordDiagnostic({ type: 'webhook_error', route: url.pathname, error: 'Webhook endpoint not found.' })
      sendJson(response, 404, { error: 'Webhook endpoint not found.' })
      return true
    }
    liveDemo.recordDiagnostic({
      type: 'webhook_processed',
      route: url.pathname,
      eventId: summarizeInboundPayload(payload).eventId,
      sessionId: result?.id ?? null,
      status: result?.status ?? null,
      currentNodeId: result?.currentNodeId ?? null,
    })
    sendJson(response, 202, { accepted: true })
    return true
  } catch (error) {
    liveDemo.recordDiagnostic({
      type: 'webhook_error',
      route: url.pathname,
      ...(payload ? summarizeInboundPayload(payload) : {}),
      error: error instanceof Error ? error.message : 'Unexpected webhook error.',
    })
    apiError(response, error)
    return true
  }
}

export function createApp({ env = process.env, liveDemo, shareLinks = createShareLinks({ env }) } = {}) {
  const config = liveDemo?.config ?? getLiveDemoConfig(env, projectRoot)
  const service = liveDemo ?? new LiveDemoService(config)
  return createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost')
    try {
      if (await shareLinks.handle(request, response, url)) return
      if (url.pathname.startsWith('/api/live/') && await handleApi(request, response, url, service)) return
      if (url.pathname.startsWith('/webhooks/vonage/') && await handleWebhook(request, response, url, service)) return
    } catch (error) {
      apiError(response, error)
      return
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(response, 405, 'Method Not Allowed')
      return
    }
    if (url.pathname === '/_/health') {
      send(response, 200, 'OK')
      return
    }
    const filePath = requestedFile(url.pathname)
    if (filePath) {
      const directFile = statSync(filePath, { throwIfNoEntry: false })?.isDirectory() ? join(filePath, 'index.html') : filePath
      if (sendFile(request, response, directFile)) return
    }
    if (!extname(url.pathname)) {
      const indexFile = join(distDirectory, 'index.html')
      if (sendFile(request, response, indexFile)) return
    }
    send(response, existsSync(distDirectory) ? 404 : 503, existsSync(distDirectory) ? 'Not Found' : 'The production build is not available')
  })
}
