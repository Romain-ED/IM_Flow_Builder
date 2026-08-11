/**
 * Encodes a flow's raw source text into a URL so it can be shared without a
 * backend or a file attachment. Uses the browser's native CompressionStream
 * (gzip) when available, falling back to plain base64url on older browsers —
 * either way, no new dependency is needed.
 */

const HASH_PARAM = 'flow'

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
    const buffer = await new Response(stream).arrayBuffer()
    return new TextDecoder().decode(buffer)
  }
  return new TextDecoder().decode(bytes)
}

/** Builds a full shareable URL embedding the given flow source in the hash. */
export async function buildShareUrl(source: string): Promise<string> {
  const encoded = await encode(source)
  const url = new URL(window.location.href)
  url.hash = `${HASH_PARAM}=${encoded}`
  return url.toString()
}

/** Reads and decodes a shared flow from the current URL hash, if present. */
export async function readShareHash(): Promise<string | null> {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const params = new URLSearchParams(hash)
  const value = params.get(HASH_PARAM)
  if (!value) return null
  return decode(value)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
