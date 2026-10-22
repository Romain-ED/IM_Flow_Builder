import { createHash, randomBytes } from 'node:crypto'
import { resolveShareStore } from './shareStore.js'

/**
 * Short, permanent, read-only share links.
 *
 *   POST /api/share        { "source": "<flow YAML/JSON text>" }  ->  { "id": "<id>" }
 *   GET  /api/share/<id>                                          ->  { "source": "<text>" }
 *
 * SECURITY: the POST endpoint is intentionally UNAUTHENTICATED (anyone with a
 * link can open a scenario, and any editor user can create one). It is bounded
 * by a body/source size cap, a per-IP rate limit, content-hash dedupe and a
 * total storage budget. The stored text is never parsed, executed or rendered
 * server-side; it is returned verbatim as a JSON string. No CORS headers are
 * sent, so only the same-origin app can call it from a browser.
 */

export const MAX_SOURCE_BYTES = 1_000_000
const MAX_BODY_BYTES = MAX_SOURCE_BYTES + 4_096
const ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/
const DEFAULT_LIMITS = {
  /** Link creations per client IP per window. */
  create: { max: 20, windowMs: 10 * 60_000 },
  /** Link reads per client IP per window. */
  read: { max: 300, windowMs: 10 * 60_000 },
  /** Total stored links / bytes across all clients (permanent storage budget). */
  maxLinks: 5_000,
  maxBytes: 100_000_000,
}

export function isValidShareId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'",
    ...extraHeaders,
  })
  response.end(JSON.stringify(body))
}

function sendError(response, statusCode, code, message, extraHeaders) {
  sendJson(response, statusCode, { error: { code, message } }, extraHeaders)
}

/** Rightmost X-Forwarded-For entry (appended by the platform proxy), else the socket address. */
function clientIp(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const last = forwarded.split(',').pop().trim()
    if (last) return last
  }
  return request.socket?.remoteAddress ?? 'unknown'
}

function createRateLimiter(now) {
  const windows = new Map()
  return function hit(bucket, ip, { max, windowMs }) {
    const key = `${bucket}|${ip}`
    const time = now()
    if (windows.size > 10_000) {
      for (const [entryKey, entry] of windows) if (entry.resetAt <= time) windows.delete(entryKey)
    }
    let entry = windows.get(key)
    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowMs }
      windows.set(key, entry)
    }
    entry.count += 1
    return entry.count > max ? Math.max(1, Math.ceil((entry.resetAt - time) / 1000)) : 0
  }
}

class BodyTooLargeError extends Error {}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const declared = Number(request.headers['content-length'])
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      reject(new BodyTooLargeError())
      return
    }
    const chunks = []
    let length = 0
    request.on('data', (chunk) => {
      length += chunk.length
      if (length > MAX_BODY_BYTES) {
        reject(new BodyTooLargeError())
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

/**
 * @param {object} [options]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {object} [options.store] key/value store (see shareStore.js); resolved from env when omitted
 * @param {object} [options.limits] overrides for DEFAULT_LIMITS
 * @param {() => number} [options.now]
 */
export function createShareLinks({ env = process.env, store, limits = {}, now = Date.now } = {}) {
  const config = { ...DEFAULT_LIMITS, ...limits }
  const hit = createRateLimiter(now)
  let resolvedStore = store
  let storeResolved = store !== undefined

  function getStore() {
    if (!storeResolved) {
      resolvedStore = resolveShareStore(env)
      storeResolved = true
    }
    return resolvedStore
  }

  async function create(request, response, shareStore) {
    if (!/^application\/json\b/i.test(String(request.headers['content-type'] ?? ''))) {
      sendError(response, 415, 'SHARE_BAD_REQUEST', 'Content-Type must be application/json.')
      return
    }
    let body
    try {
      body = await readBody(request)
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        // Discard the rest of the upload (so the client can read the 413), but
        // cut the connection off shortly after rather than drain without bound.
        request.resume()
        setTimeout(() => request.destroy(), 2_000).unref()
        sendError(response, 413, 'SHARE_TOO_LARGE', 'The scenario is too large to share as a short link.')
        return
      }
      throw error
    }
    let source
    try {
      source = JSON.parse(body.toString('utf8'))?.source
    } catch {
      sendError(response, 400, 'SHARE_BAD_REQUEST', 'Request body must be valid JSON.')
      return
    }
    if (typeof source !== 'string' || !source.trim()) {
      sendError(response, 400, 'SHARE_BAD_REQUEST', '"source" must be a non-empty string.')
      return
    }
    const size = Buffer.byteLength(source, 'utf8')
    if (size > MAX_SOURCE_BYTES) {
      sendError(response, 413, 'SHARE_TOO_LARGE', 'The scenario is too large to share as a short link.')
      return
    }

    // Dedupe: identical content always maps to the same id, so repeated POSTs cost no storage.
    const digest = createHash('sha256').update(source).digest('hex')
    const existingId = await shareStore.get(`hash:${digest}`)
    if (isValidShareId(existingId) && (await shareStore.get(`s:${existingId}`)) !== null) {
      sendJson(response, 200, { id: existingId })
      return
    }

    // Reserve budget first so concurrent requests cannot overshoot the cap.
    const links = await shareStore.increment('count', 1)
    const bytes = await shareStore.increment('bytes', size)
    if (links > config.maxLinks || bytes > config.maxBytes) {
      await shareStore.decrement('count', 1)
      await shareStore.decrement('bytes', size)
      sendError(response, 507, 'SHARE_STORAGE_FULL', 'Short links are temporarily unavailable.')
      return
    }
    const id = randomBytes(16).toString('base64url')
    try {
      await shareStore.set(`s:${id}`, source)
      await shareStore.set(`hash:${digest}`, id)
    } catch (error) {
      await shareStore.decrement('count', 1).catch(() => {})
      await shareStore.decrement('bytes', size).catch(() => {})
      throw error
    }
    sendJson(response, 201, { id })
  }

  async function read(response, shareStore, id) {
    if (!isValidShareId(id)) {
      sendError(response, 400, 'SHARE_INVALID_ID', 'Invalid share link id.')
      return
    }
    const source = await shareStore.get(`s:${id}`)
    if (typeof source !== 'string') {
      sendError(response, 404, 'SHARE_NOT_FOUND', 'Share link not found.')
      return
    }
    sendJson(response, 200, { source })
  }

  /** Returns true when the request was for /api/share and has been answered. */
  async function handle(request, response, url) {
    const isCollection = url.pathname === '/api/share'
    const isItem = url.pathname.startsWith('/api/share/')
    if (!isCollection && !isItem) return false

    const method = request.method
    const allowed = isCollection ? 'POST' : 'GET, HEAD'
    if (isCollection ? method !== 'POST' : method !== 'GET' && method !== 'HEAD') {
      sendError(response, 405, 'SHARE_METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: allowed })
      return true
    }

    const retryAfter = isCollection
      ? hit('create', clientIp(request), config.create)
      : hit('read', clientIp(request), config.read)
    if (retryAfter) {
      sendError(response, 429, 'SHARE_RATE_LIMITED', 'Too many requests. Try again later.', { 'Retry-After': String(retryAfter) })
      return true
    }

    try {
      const shareStore = getStore()
      if (!shareStore) {
        sendError(response, 503, 'SHARE_UNAVAILABLE', 'Short links are not available on this server.')
        return true
      }
      if (isCollection) await create(request, response, shareStore)
      else await read(response, shareStore, url.pathname.slice('/api/share/'.length))
    } catch (error) {
      console.error('share link storage error:', error instanceof Error ? error.message : error)
      if (!response.headersSent) sendError(response, 503, 'SHARE_UNAVAILABLE', 'Short links are temporarily unavailable.')
    }
    return true
  }

  return { handle }
}
