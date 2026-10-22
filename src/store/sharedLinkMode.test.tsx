import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { BUILT_IN_SCENARIOS, DEFAULT_SCENARIO } from '../scenarios'

// The store decides "read-only share link" from the URL at creation time, so
// each test sets the hash first and then imports fresh copies of the modules.
async function load(hash: string) {
  vi.resetModules()
  window.history.replaceState(null, '', `/${hash}`)
  const store = await import('./simulatorStore')
  return { store: store.useSimulatorStore }
}

// jsdom has no Blob.stream(), so build the uncompressed ('r.') link form the
// app itself falls back to on browsers without CompressionStream.
async function sharedHash(source: string, platform?: 'ios' | 'android') {
  const bytes = new TextEncoder().encode(source)
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `#flow=r.${b64}${platform ? `&platform=${platform}` : ''}`
}

describe('read-only shared link', { timeout: 60_000 }, () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    cleanup()
    window.history.replaceState(null, '', '/')
  })

  it('loads the shared flow in read-only mode without touching localStorage', async () => {
    const hash = await sharedHash(DEFAULT_SCENARIO.source, 'android')
    const { store } = await load(hash)
    expect(store.getState().sharedLinkMode).toBe(true)
    await store.getState().initialize()
    const s = store.getState()
    expect(s.flow).not.toBeNull()
    expect(s.sharedLinkError).toBeNull()
    expect(s.phonePlatform).toBe('android')
    expect(window.localStorage.length).toBe(0)
  })

  it('ignores the visitor\'s saved scenarios and preferences', async () => {
    window.localStorage.setItem('bmfs.customScenarios.v1', JSON.stringify([{ id: 'x', name: 'Mine', source: 'a', format: 'yaml' }]))
    window.localStorage.setItem('bmfs.preferences.v1', JSON.stringify({ phonePlatform: 'android', presenterMode: true }))
    const before = { ...window.localStorage }
    const hash = await sharedHash(DEFAULT_SCENARIO.source)
    const { store } = await load(hash)
    await store.getState().initialize()
    const s = store.getState()
    expect(s.customScenarios).toEqual([])
    expect(s.phonePlatform).toBe('ios')
    expect(s.presenterMode).toBe(false)
    expect({ ...window.localStorage }).toEqual(before)
  })

  it('allows platform switch and restart but blocks editing actions', async () => {
    const hash = await sharedHash(DEFAULT_SCENARIO.source)
    const { store } = await load(hash)
    await store.getState().initialize()
    const flowBefore = store.getState().flow
    const sourceBefore = store.getState().flowSource

    store.getState().setPhonePlatform('android')
    expect(store.getState().phonePlatform).toBe('android')
    store.getState().restart()
    expect(store.getState().events[0]?.type).toBe('scenario_restarted')

    store.getState().loadBuiltInScenario(store.getState().customScenarios[0]?.id ?? 'ecommerce')
    expect(store.getState().loadScenarioSource('version: "1.0"')).toBe(false)
    expect(store.getState().importCustomScenario(DEFAULT_SCENARIO.source).success).toBe(false)
    store.getState().updateConfiguredVariable('customerName', 'Mallory')
    store.getState().togglePresenterMode()
    store.getState().setChannel('whatsapp')
    store.getState().toggleCompareMode()
    store.getState().toggleDebugPanel()

    const s = store.getState()
    expect(s.flow).toBe(flowBefore)
    expect(s.flowSource).toBe(sourceBefore)
    expect(s.configuredVariables.customerName).not.toBe('Mallory')
    expect(s.presenterMode).toBe(false)
    expect(s.compareMode).toBe(false)
    expect(s.debugPanelOpen).toBe(false)
    expect(s.customScenarios).toEqual([])
    expect(window.localStorage.length).toBe(0)
  })

  it.each([
    ['garbage', '#flow=!!!not-base64!!!'],
    ['bad gzip', '#flow=z.AAAA'],
    ['empty', '#flow='],
    ['not a flow', '#flow=r.' + btoa('just some text: [').replace(/=+$/, '')],
  ])('fails safely on a malformed link (%s)', async (_name, hash) => {
    const { store } = await load(hash)
    expect(store.getState().sharedLinkMode).toBe(true)
    await store.getState().initialize()
    const s = store.getState()
    expect(s.flow).toBeNull()
    expect(s.sharedLinkError).toBeTruthy()
    expect(window.localStorage.length).toBe(0)
  })

  it('shows the viewer controls only, never the editor', async () => {
    const hash = await sharedHash(DEFAULT_SCENARIO.source)
    await load(hash)
    const { default: App } = await import('../App')
    render(<App />)
    expect(await screen.findByRole('button', { name: /restart/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /android/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /android/i }))
    expect(screen.getByRole('radio', { name: /android/i })).toHaveAttribute('aria-checked', 'true')
    for (const name of [/edit flow/i, /scenarios/i, /manual/i, /copy share link/i, /export/i]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('shows a clear message for an invalid link and no editor', async () => {
    await load('#flow=z.AAAA')
    const { default: App } = await import('../App')
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't be opened/i)
    await waitFor(() => expect(screen.queryByRole('button', { name: /edit flow/i })).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /restart/i })).not.toBeInTheDocument()
  })
})

const SHORT_ID = 'AbCdEfGhIjKlMnOpQrStUv'

function stubShareApi(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('short and built-in share links', { timeout: 60_000 }, () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('loads a flow from a short #s= link', async () => {
    const fetchMock = stubShareApi(() => json(200, { source: DEFAULT_SCENARIO.source }))
    const { store } = await load(`#s=${SHORT_ID}&platform=android`)
    expect(store.getState().sharedLinkMode).toBe(true)
    await store.getState().initialize()
    const s = store.getState()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/share/${SHORT_ID}`)
    expect(s.flow).not.toBeNull()
    expect(s.sharedLinkError).toBeNull()
    expect(s.phonePlatform).toBe('android')
    expect(window.localStorage.length).toBe(0)
  })

  it('shows an error for an unknown short id', async () => {
    stubShareApi(() => json(404, { error: { code: 'SHARE_NOT_FOUND', message: 'nope' } }))
    const { store } = await load(`#s=${SHORT_ID}`)
    await store.getState().initialize()
    const s = store.getState()
    expect(s.flow).toBeNull()
    expect(s.sharedLinkError).toMatch(/^This shared link no longer exists/)
  })

  it.each(['short', '../etc/passwd', 'a'.repeat(65), `${SHORT_ID}/x`, ''])('rejects malformed id %j without a request', async (id) => {
    const fetchMock = stubShareApi(() => json(200, { source: DEFAULT_SCENARIO.source }))
    const { store } = await load(`#s=${encodeURIComponent(id)}`)
    expect(store.getState().sharedLinkMode).toBe(true)
    await store.getState().initialize()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.getState().flow).toBeNull()
    expect(store.getState().sharedLinkError).toMatch(/^This shared link/)
  })

  it('shows a retry message when the server cannot be reached', async () => {
    stubShareApi(() => { throw new TypeError('Failed to fetch') })
    const { store } = await load(`#s=${SHORT_ID}`)
    await store.getState().initialize()
    expect(store.getState().flow).toBeNull()
    expect(store.getState().sharedLinkError).toMatch(/could not be loaded right now/)
  })

  it('rejects a short link whose stored source is not a valid flow', async () => {
    stubShareApi(() => json(200, { source: 'just some text: [' }))
    const { store } = await load(`#s=${SHORT_ID}`)
    await store.getState().initialize()
    expect(store.getState().flow).toBeNull()
    expect(store.getState().sharedLinkError).toBeTruthy()
  })

  it('stays locked against edits after a short-link load', async () => {
    stubShareApi(() => json(200, { source: DEFAULT_SCENARIO.source }))
    const { store } = await load(`#s=${SHORT_ID}`)
    await store.getState().initialize()
    const flowBefore = store.getState().flow
    expect(store.getState().loadScenarioSource(BUILT_IN_SCENARIOS[1].source)).toBe(false)
    store.getState().loadBuiltInScenario(BUILT_IN_SCENARIOS[1].id)
    expect(store.getState().importCustomScenario(DEFAULT_SCENARIO.source).success).toBe(false)
    store.getState().setChannel('whatsapp')
    store.getState().togglePresenterMode()
    expect(store.getState().flow).toBe(flowBefore)
    expect(store.getState().presenterMode).toBe(false)
    store.getState().setPhonePlatform('android')
    expect(store.getState().phonePlatform).toBe('android')
    expect(window.localStorage.length).toBe(0)
  })

  it('renders the read-only viewer for a short link and an error for a bad one', async () => {
    stubShareApi(() => json(200, { source: DEFAULT_SCENARIO.source }))
    await load(`#s=${SHORT_ID}`)
    const { default: App } = await import('../App')
    render(<App />)
    expect(await screen.findByRole('button', { name: /restart/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit flow/i })).not.toBeInTheDocument()
    cleanup()

    stubShareApi(() => json(404, {}))
    await load(`#s=${SHORT_ID}`)
    const { default: App2 } = await import('../App')
    render(<App2 />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer exists/i)
    expect(screen.queryByRole('button', { name: /edit flow/i })).not.toBeInTheDocument()
  })

  it('loads a built-in scenario from #scenario=<id> without any request', async () => {
    const fetchMock = stubShareApi(() => json(500, {}))
    const target = BUILT_IN_SCENARIOS[1]
    const { store } = await load(`#scenario=${target.id}&platform=android`)
    expect(store.getState().sharedLinkMode).toBe(true)
    await store.getState().initialize()
    const s = store.getState()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(s.sharedLinkError).toBeNull()
    expect(s.flowSource).toBe(target.source)
    expect(s.phonePlatform).toBe('android')
  })

  it.each(['no-such-scenario', '__proto__', ''])('shows an error for unknown built-in id %j', async (id) => {
    const { store } = await load(`#scenario=${id}`)
    expect(store.getState().sharedLinkMode).toBe(true)
    await store.getState().initialize()
    expect(store.getState().flow).toBeNull()
    expect(store.getState().sharedLinkError).toMatch(/does not exist in this version/)
  })

  it('still opens long #flow= links without contacting the server', async () => {
    const fetchMock = stubShareApi(() => json(500, {}))
    const { store } = await load(await sharedHash(DEFAULT_SCENARIO.source, 'android'))
    await store.getState().initialize()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.getState().flow).not.toBeNull()
    expect(store.getState().phonePlatform).toBe('android')
  })
})

describe('buildShareUrl', { timeout: 60_000 }, () => {
  const modified = `${DEFAULT_SCENARIO.source}\n# edited by the sender\n`

  beforeEach(() => {
    // jsdom has no Blob.stream(); use the uncompressed fallback encoding.
    vi.stubGlobal('CompressionStream', undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  async function build(source: string) {
    vi.resetModules()
    const { buildShareUrl } = await import('../utils/shareLink')
    return buildShareUrl(source, 'android')
  }

  it('uses the built-in id for an unmodified built-in, without a request', async () => {
    const fetchMock = stubShareApi(() => json(201, { id: SHORT_ID }))
    const url = new URL(await build(DEFAULT_SCENARIO.source))
    expect(url.hash).toBe(`#scenario=${DEFAULT_SCENARIO.id}&platform=android`)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses a short #s= link for a modified scenario', async () => {
    const fetchMock = stubShareApi(() => json(201, { id: SHORT_ID }))
    const url = new URL(await build(modified))
    expect(url.hash).toBe(`#s=${SHORT_ID}&platform=android`)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/share')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ source: modified })
  })

  it.each([
    ['network error', () => { throw new TypeError('Failed to fetch') }],
    ['HTTP 503', () => json(503, {})],
    ['HTTP 429', () => json(429, {})],
    ['unusable response', () => json(201, { id: '../bad' })],
  ])('falls back to a long #flow= link on %s, and that link opens', async (_name, handler) => {
    stubShareApi(handler)
    const url = new URL(await build(modified))
    expect(url.hash.startsWith('#flow=')).toBe(true)
    expect(url.hash).toContain('&platform=android')
    vi.unstubAllGlobals()
    const { store } = await load(url.hash)
    await store.getState().initialize()
    expect(store.getState().sharedLinkError).toBeNull()
    expect(store.getState().flowSource).toBe(modified)
  })
})
