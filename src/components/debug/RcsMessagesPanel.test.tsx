import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { RcsMessagesPanel } from './RcsMessagesPanel'

describe('RcsMessagesPanel', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    useSimulatorStore.setState({ liveSessionId: null, rcsMessagesPanelOpen: false })
  })

  it('asks for a live session when none has started', () => {
    useSimulatorStore.setState({ liveSessionId: null })
    render(<RcsMessagesPanel />)
    expect(screen.getByText(/No live RCS session yet/)).toBeTruthy()
  })

  it('loads the webhook timeline for the current live session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generatedAt: '2026-11-18T00:00:00.000Z',
        session: { id: 'sess-1', status: 'running', recipient: 'masked', currentNodeId: 'start', eventCount: 2, outboundCount: 1 },
        diagnostics: [{ id: 'd1', type: 'inbound_webhook', at: '2026-11-18T00:00:00.000Z' }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    useSimulatorStore.setState({ liveSessionId: 'sess-1' })

    render(<RcsMessagesPanel />)

    expect(await screen.findByText('inbound_webhook')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/api/live/logs?sessionId=sess-1')
  })

  it('toggles the panel flag', () => {
    useSimulatorStore.setState({ rcsMessagesPanelOpen: false })
    useSimulatorStore.getState().toggleRcsMessagesPanel()
    expect(useSimulatorStore.getState().rcsMessagesPanelOpen).toBe(true)
    useSimulatorStore.getState().toggleRcsMessagesPanel()
    expect(useSimulatorStore.getState().rcsMessagesPanelOpen).toBe(false)
  })
})
