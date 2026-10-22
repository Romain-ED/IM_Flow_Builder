/**
 * Builds and reads read-only share links. Three hash formats are understood:
 *
 *  - `#scenario=<built-in id>`: an unmodified built-in scenario (shortest).
 *  - `#s=<id>`: a short link; the source is stored on the server (`/api/share`)
 *    and fetched when the link is opened. Permanent, but needs the server.
 *  - `#flow=<payload>`: self-contained long link (gzip + base64url of the
 *    source), needs no backend. Also the fallback when the server is
 *    unreachable, and kept working for links created before short links.
 *
 * Every format ends in the same loadScenarioSource() path in the store, so a
 * viewer can never get anything beyond the one validated scenario.
 */

import { phonePlatformSchema, type PhonePlatform } from '../schema/platform'
import { BUILT_IN_SCENARIOS } from '../scenarios'

const HASH_PARAM = 'flow'
const SHORT_PARAM = 's'
const BUILT_IN_PARAM = 'scenario'
const PLATFORM_PARAM = 'platform'
/** Upper bound on a decoded shared flow, so a crafted link can't inflate into something huge. */
const MAX_DECODED_BYTES = 2 * 1024 * 1024
/** Matches the server's id format (server/shareLinks.js). Checked before any request is made. */
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/
/** The server rejects sources over 1 MB; skip the round trip for those. */
const MAX_SHORT_LINK_BYTES = 1_000_000
const SHARE_API_TIMEOUT_MS = 8_000
const DAMAGED_MESSAGE = 'This shared link is damaged or incomplete. Ask the sender for a new link.'

function shareApiUrl(suffix = ''): string {
  return `${import.meta.env.BASE_URL}api/share${suffix}`
}

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SHARE_API_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function hashParams(): URLSearchParams {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash)
}

async function readAllLimited(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_DECODED_BYTES) {
      await reader.cancel()
      throw new Error('This shared link is too large to open.')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function encode(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  if (typeof CompressionStream === 'undefined') {
    return 'r.' + bytesToBase64Url(bytes)
  }
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
  const buffer = await new Response(stream).arrayBuffer()
  return 'z.' + bytesToBase64Url(new Uint8Array(buffer))
}

async function decode(value: string): Promise<string> {
  const [tag, payload] = value.includes('.') ? value.split(/\.(.*)/s) : ['r', value]
  const bytes = base64UrlToBytes(payload)
  if (tag === 'z') {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress shared links — try a recent Chrome, Firefox, or Safari.')
    }
    const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new TextDecoder('utf-8', { fatal: true }).decode(await readAllLimited(stream))
  }
  if (bytes.byteLength > MAX_DECODED_BYTES) throw new Error('This shared link is too large to open.')
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function withHash(params: string): string {
  const url = new URL(window.location.href)
  url.hash = params
  return url.toString()
}

/** Stores the source on the server and returns its short id, or null on any failure. */
async function createShortId(source: string): Promise<string | null> {
  if (new TextEncoder().encode(source).byteLength > MAX_SHORT_LINK_BYTES) return null
  try {
    const response = await fetchWithTimeout(shareApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { id?: unknown }
    return typeof body.id === 'string' && SHARE_ID_PATTERN.test(body.id) ? body.id : null
  } catch {
    return null
  }
}

/**
 * Builds a full shareable URL for the given flow source. In order of
 * preference: the built-in id (source is an unmodified built-in), a short
 * server-backed id, then the self-contained long link if the server is
 * unreachable or refuses. `platform` is only the phone the viewer starts on;
 * they can still switch.
 */
export async function buildShareUrl(source: string, platform?: PhonePlatform): Promise<string> {
  const suffix = platform ? `&${PLATFORM_PARAM}=${platform}` : ''
  const builtIn = BUILT_IN_SCENARIOS.find((scenario) => scenario.source === source)
  if (builtIn) return withHash(`${BUILT_IN_PARAM}=${encodeURIComponent(builtIn.id)}${suffix}`)
  const id = await createShortId(source)
  if (id) return withHash(`${SHORT_PARAM}=${id}${suffix}`)
  return withHash(`${HASH_PARAM}=${await encode(source)}${suffix}`)
}

/**
 * True when the URL hash carries a share-link payload, even an empty or
 * malformed one. Synchronous so the app can enter read-only mode before its
 * first render rather than flashing the editor while the payload decodes.
 */
export function hasShareHash(): boolean {
  if (typeof window === 'undefined') return false
  const params = hashParams()
  return params.has(HASH_PARAM) || params.has(SHORT_PARAM) || params.has(BUILT_IN_PARAM)
}

/** Initial phone platform requested by the share link, if present and valid. */
export function readSharedPlatform(): PhonePlatform | null {
  const parsed = phonePlatformSchema.safeParse(hashParams().get(PLATFORM_PARAM))
  return parsed.success ? parsed.data : null
}

async function readLongLink(): Promise<string> {
  const value = hashParams().get(HASH_PARAM)
  if (!value) throw new Error('This shared link is empty.')
  const source = await decode(value)
  if (!source.trim()) throw new Error('This shared link is empty.')
  return source
}

function readBuiltIn(id: string): string {
  const scenario = BUILT_IN_SCENARIOS.find((candidate) => candidate.id === id)
  if (!scenario) throw new Error('This shared link points to a scenario that does not exist in this version of the app.')
  return scenario.source
}

async function readShortLink(id: string): Promise<string> {
  if (!SHARE_ID_PATTERN.test(id)) throw new Error(DAMAGED_MESSAGE)
  let response: Response
  try {
    response = await fetchWithTimeout(shareApiUrl(`/${id}`))
  } catch {
    throw new Error('This shared link could not be loaded right now. Check your connection and try again.')
  }
  if (response.status === 404) {
    throw new Error('This shared link no longer exists or was never created. Ask the sender for a new link.')
  }
  if (response.status === 400) throw new Error(DAMAGED_MESSAGE)
  if (!response.ok) {
    throw new Error('This shared link could not be loaded right now. Check your connection and try again.')
  }
  let source: unknown
  try {
    source = ((await response.json()) as { source?: unknown }).source
  } catch {
    throw new Error(DAMAGED_MESSAGE)
  }
  if (typeof source !== 'string' || !source.trim()) throw new Error('This shared link is empty.')
  if (new TextEncoder().encode(source).byteLength > MAX_DECODED_BYTES) throw new Error('This shared link is too large to open.')
  return source
}

/**
 * Resolves the flow source named by the current URL hash, whichever link
 * format it uses. Throws an Error whose message starts with "This shared
 * link" when it cannot be resolved; the store shows those messages as-is.
 */
export async function readSharedSource(): Promise<string> {
  const params = hashParams()
  if (params.has(SHORT_PARAM)) return readShortLink(params.get(SHORT_PARAM) ?? '')
  if (params.has(BUILT_IN_PARAM)) return readBuiltIn(params.get(BUILT_IN_PARAM) ?? '')
  return readLongLink()
}

/**
 * Copies text to the clipboard. Accepts a promise so callers can start the
 * clipboard write inside the click handler and resolve the text later (short
 * links need a network round trip); Safari only allows that via ClipboardItem.
 */
export async function copyToClipboard(text: string | Promise<string>): Promise<boolean> {
  try {
    if (typeof text !== 'string' && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const blob = text.then((value) => new Blob([value], { type: 'text/plain' }))
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
      return true
    }
    await navigator.clipboard.writeText(await text)
    return true
  } catch {
    return false
  }
}
