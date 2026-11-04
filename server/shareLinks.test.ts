// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { createShareLinks, MAX_SOURCE_BYTES } from './shareLinks.js'
import { createFileShareStore, createMemoryShareStore, isVcrRuntime, resolveShareStore } from './shareStore.js'

const servers = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))))
})

async function start(options = {}) {
  const store = options.store === undefined ? createMemoryShareStore() : options.store
  const shareLinks = createShareLinks({ env: {}, store, limits: options.limits })
  const app = createApp({ env: {}, shareLinks })
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve))
  servers.push(app)
  return { origin: `http://127.0.0.1:${app.address().port}`, store }
}

const post = (origin, body, headers = { 'Content-Type': 'application/json' }) =>
  fetch(`${origin}/api/share`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })

describe('share link API', () => {
  it('stores a scenario and returns it by id with hardened headers', async () => {
    const { origin } = await start()
    const created = await post(origin, { source: 'version: "1.0"\n' })
    expect(created.status).toBe(201)
    const { id } = await created.json()
    expect(id).toMatch(/^[A-Za-z0-9_-]{16,}$/)

    const fetched = await fetch(`${origin}/api/share/${id}`)
    expect(fetched.status).toBe(200)
    expect(fetched.headers.get('content-type')).toContain('application/json')
    expect(fetched.headers.get('x-content-type-options')).toBe('nosniff')
    expect(fetched.headers.get('access-control-allow-origin')).toBeNull()
    expect(await fetched.json()).toEqual({ source: 'version: "1.0"\n' })
  })

  it('dedupes identical content and uses unguessable distinct ids otherwise', async () => {
    const { origin, store } = await start()
    const a = await (await post(origin, { source: 'a: 1' })).json()
    const again = await post(origin, { source: 'a: 1' })
    expect(again.status).toBe(200)
    expect((await again.json()).id).toBe(a.id)
    const b = await (await post(origin, { source: 'b: 2' })).json()
    expect(b.id).not.toBe(a.id)
    expect(await store.get('count')).toBe('2')
  })

  it('rejects invalid bodies', async () => {
    const { origin } = await start()
    expect((await post(origin, { source: '' })).status).toBe(400)
    expect((await post(origin, { source: '   ' })).status).toBe(400)
    expect((await post(origin, { source: 42 })).status).toBe(400)
    expect((await post(origin, {})).status).toBe(400)
    expect((await post(origin, 'not json')).status).toBe(400)
    expect((await post(origin, { source: 'x' }, { 'Content-Type': 'text/plain' })).status).toBe(415)
  })

  it('rejects oversized sources and bodies', async () => {
    const { origin } = await start()
    expect((await post(origin, { source: 'x'.repeat(MAX_SOURCE_BYTES + 1) })).status).toBe(413)
    expect((await post(origin, { source: 'x'.repeat(MAX_SOURCE_BYTES + 100_000) })).status).toBe(413)
    expect((await post(origin, { source: 'x'.repeat(MAX_SOURCE_BYTES) })).status).toBe(201)
  })

  it('returns 404 for unknown ids and rejects malformed ids without touching the store', async () => {
    const reads = []
    const store = createMemoryShareStore()
    const get = store.get
    store.get = (key) => { reads.push(key); return get(key) }
    const { origin } = await start({ store })

    const unknown = await fetch(`${origin}/api/share/${'A'.repeat(22)}`)
    expect(unknown.status).toBe(404)
    expect((await unknown.json()).error.code).toBe('SHARE_NOT_FOUND')

    reads.length = 0
    for (const bad of ['short', '..%2F..%2Fetc%2Fpasswd', 'a'.repeat(65), `${'A'.repeat(20)}:x`, `${'A'.repeat(20)}%00`, `${'A'.repeat(20)}%2Fx`]) {
      const response = await fetch(`${origin}/api/share/${bad}`)
      expect(response.status, bad).toBe(400)
    }
    expect(reads).toEqual([])
  })

  it('rate limits per IP', async () => {
    const { origin } = await start({ limits: { create: { max: 2, windowMs: 60_000 } } })
    expect((await post(origin, { source: 'a' })).status).toBe(201)
    expect((await post(origin, { source: 'b' })).status).toBe(201)
    const limited = await post(origin, { source: 'c' })
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
  })

  it('enforces the total storage budget', async () => {
    const { origin, store } = await start({ limits: { maxLinks: 1 } })
    expect((await post(origin, { source: 'a' })).status).toBe(201)
    expect((await post(origin, { source: 'b' })).status).toBe(507)
    expect(await store.get('count')).toBe('1')
    // Existing content still dedupes without consuming budget.
    expect((await post(origin, { source: 'a' })).status).toBe(200)
  })

  it('answers 503 when no durable store is configured and 405 for wrong methods', async () => {
    const { origin } = await start({ store: null })
    expect((await post(origin, { source: 'a' })).status).toBe(503)
    expect((await fetch(`${origin}/api/share/${'A'.repeat(22)}`)).status).toBe(503)
    const { origin: other } = await start()
    expect((await fetch(`${other}/api/share`, { method: 'GET' })).status).toBe(405)
    expect((await fetch(`${other}/api/share/${'A'.repeat(22)}`, { method: 'DELETE' })).status).toBe(405)
  })

  it('answers 503 (not a crash) when the store throws', async () => {
    const store = createMemoryShareStore()
    store.get = async () => { throw new Error('redis down') }
    const { origin } = await start({ store })
    expect((await post(origin, { source: 'a' })).status).toBe(503)
  })
})

describe('share store selection', () => {
  it('uses VCR account state on VCR, a file only when opted in locally, otherwise nothing', () => {
    expect(isVcrRuntime({ VCR_INSTANCE_PUBLIC_URL: 'https://x' })).toBe(true)
    expect(resolveShareStore({ VCR_REGION: 'aws.apse1', SHARE_STORE_PATH: '/tmp/ignored.json' }).kind).toBe('vcr-account-state')
    expect(resolveShareStore({})).toBeNull()
    const dir = mkdtempSync(join(tmpdir(), 'share-store-'))
    try {
      expect(resolveShareStore({ SHARE_STORE_PATH: join(dir, 's.json') }).kind).toBe('local-file')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('file store persists across instances', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'share-store-'))
    try {
      const path = join(dir, 's.json')
      await createFileShareStore(path).set('s:abc', 'hello')
      expect(await createFileShareStore(path).get('s:abc')).toBe('hello')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
