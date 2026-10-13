import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { DEFAULT_SCENARIO } from '../scenarios'

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
