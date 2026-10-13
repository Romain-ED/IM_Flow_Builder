/**
 * Encodes a flow's raw source text into a URL so it can be shared without a
 * backend or a file attachment. Uses the browser's native CompressionStream
 * (gzip) when available, falling back to plain base64url on older browsers —
 * either way, no new dependency is needed.
 */

import { phonePlatformSchema, type PhonePlatform } from '../schema/platform'

const HASH_PARAM = 'flow'
const PLATFORM_PARAM = 'platform'
/** Upper bound on a decoded shared flow, so a crafted link can't inflate into something huge. */
const MAX_DECODED_BYTES = 2 * 1024 * 1024

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

/**
 * Builds a full shareable URL embedding the given flow source in the hash.
 * `platform` is only the phone the viewer starts on; they can still switch.
 */
export async function buildShareUrl(source: string, platform?: PhonePlatform): Promise<string> {
  const encoded = await encode(source)
  const url = new URL(window.location.href)
  url.hash = `${HASH_PARAM}=${encoded}${platform ? `&${PLATFORM_PARAM}=${platform}` : ''}`
  return url.toString()
}

/**
 * True when the URL hash carries a share-link payload, even an empty or
 * malformed one. Synchronous so the app can enter read-only mode before its
 * first render rather than flashing the editor while the payload decodes.
 */
export function hasShareHash(): boolean {
  return typeof window !== 'undefined' && hashParams().has(HASH_PARAM)
}

/** Initial phone platform requested by the share link, if present and valid. */
export function readSharedPlatform(): PhonePlatform | null {
  const parsed = phonePlatformSchema.safeParse(hashParams().get(PLATFORM_PARAM))
  return parsed.success ? parsed.data : null
}

/** Reads and decodes a shared flow from the current URL hash. Throws if the payload is missing or malformed. */
export async function readShareHash(): Promise<string> {
  const value = hashParams().get(HASH_PARAM)
  if (!value) throw new Error('This shared link is empty.')
  const source = await decode(value)
  if (!source.trim()) throw new Error('This shared link is empty.')
  return source
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
