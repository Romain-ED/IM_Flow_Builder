import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLiveDemoConfig, LiveDemoService, verifyWebhook } from './liveDemo.js'

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
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function readJson(rawBody) {
  try {
    return JSON.parse(rawBody)
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

function bearerToken(request) {
  const header = request.headers.authorization
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : ''
}

function apiError(response, error) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  const status = message.includes('not configured') ? 503
    : message.includes('allowlisted') || message.includes('required') || message.includes('Unauthorized') ? 403
      : message.includes('No Live RCS session') ? 404
        : 422
  sendJson(response, status, { error: message })
}

async function handleApi(request, response, url, liveDemo) {
  if (request.method === 'GET' && url.pathname === '/api/live/diagnostics') {
    sendJson(response, 200, liveDemo.diagnostics())
    return true
  }
  if (!liveDemo.authorize(bearerToken(request))) {
    sendJson(response, 401, { error: 'Unauthorized.' })
    return true
  }
  try {
    if (request.method === 'POST' && url.pathname === '/api/live/sessions') {
      const body = readJson(await readBody(request))
      const session = await liveDemo.createSession(body)
      sendJson(response, 201, session)
      return true
    }
    const stopMatch = url.pathname.match(/^\/api\/live\/sessions\/([\w-]+)\/stop$/)
    if (request.method === 'POST' && stopMatch) {
      const session = liveDemo.stopSession(stopMatch[1])
      if (!session) sendJson(response, 404, { error: 'Live session not found.' })
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
  try {
    const rawBody = await readBody(request)
    if (!verifyWebhook(liveDemo.config, rawBody, request.headers['x-vonage-signature'])) {
      sendJson(response, 401, { error: 'Webhook signature verification failed.' })
      return true
    }
    const payload = readJson(rawBody)
    if (url.pathname === '/webhooks/vonage/inbound') {
      await liveDemo.handleInbound(payload)
    } else if (url.pathname === '/webhooks/vonage/status') {
      liveDemo.handleStatus(payload)
    } else {
      sendJson(response, 404, { error: 'Webhook endpoint not found.' })
      return true
    }
    sendJson(response, 202, { accepted: true })
    return true
  } catch (error) {
    apiError(response, error)
    return true
  }
}

export function createApp({ env = process.env, liveDemo } = {}) {
  const config = liveDemo?.config ?? getLiveDemoConfig(env, projectRoot)
  const service = liveDemo ?? new LiveDemoService(config)
  return createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost')
    try {
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
