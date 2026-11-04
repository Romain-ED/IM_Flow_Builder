import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { flowDefinitionSchema } from '../../schema/flow'
import { useSimulatorStore } from '../../store/simulatorStore'
import { LiveRcsControls } from './LiveRcsControls'

const rcsFlow = flowDefinitionSchema.parse({
  version: '1',
  metadata: { id: 'live-test', name: 'Live test', channel: 'rcs', trigger: 'START DEMO' },
  brand: { name: 'Demo' },
  start: 'start',
  nodes: [{ id: 'start', messages: [{ type: 'text', text: 'Hello' }], end: true }],
})

const vBankFlow = flowDefinitionSchema.parse({
  version: '1',
  metadata: { id: 'vbank-multifinance-first-repayment', name: 'V Bank', channel: 'rcs' },
  brand: { name: 'V Bank' },
  start: 'start',
  nodes: [{ id: 'start', messages: [{ type: 'text', text: 'Hello' }], end: true }],
})

describe('LiveRcsControls', () => {
  beforeEach(() => {
    useSimulatorStore.setState({
      flow: rcsFlow,
      channel: 'rcs',
      configuredVariables: {},
      liveSessionActive: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows server configuration blockers without exposing a start control', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ mode: 'disabled', ready: false, recipient: null, allowedFlowIds: [], storage: 'development file store', errors: ['LIVE_RCS_MODE must be configured.'] }),
    }))

    render(<LiveRcsControls />)

    expect(await screen.findByText(/Live RCS is disabled/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start live RCS/i })).not.toBeInTheDocument()
  })

  it('shows a passing preflight and protects the start action until an operator token is supplied', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ mode: 'fake', ready: true, recipient: '••••4567', allowedFlowIds: ['live-test'], storage: 'development file store', errors: [] }),
    }))

    render(<LiveRcsControls />)

    expect(await screen.findByText(/Flow passes strict Live RCS preflight/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start live RCS/i })).toBeDisabled()
    expect(screen.getByLabelText(/Operator access token/i)).toHaveValue('')
  })

  it('posts the selected non-menu flow when Start live RCS is clicked', async () => {
    const snapshot = {
      schemaVersion: 1,
      id: 'session-1',
      status: 'awaiting_reply',
      currentNodeId: 'start',
      variables: {},
      timeline: [{ id: 'timeline-1', ordinal: 1, nodeId: 'start', sender: 'business', message: { type: 'text', text: 'Hello' } }],
      activity: { latestInbound: null, latestOutbound: null, latestProvider: null },
      provider: { latestStatus: null, updatedAt: null },
      updatedAt: new Date().toISOString(),
    }
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>((input) => {
      const path = String(input)
      const body = path === '/api/live/diagnostics'
        ? { mode: 'fake', ready: true, recipient: '••••4567', allowedFlowIds: ['live-test'], storage: 'development file store', errors: [] }
        : snapshot
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<LiveRcsControls />)
    expect(await screen.findByText(/Flow passes strict Live RCS preflight/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Operator access token/i), { target: { value: 'operator-token' } })
    fireEvent.click(screen.getByRole('button', { name: /Start live RCS/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/live/sessions', expect.objectContaining({ method: 'POST' })))
    expect(await screen.findByText(/awaiting reply/i)).toBeInTheDocument()
    const request = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/live/sessions' && init?.method === 'POST')
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({ flow: { metadata: { id: 'live-test' } } })
  })
  it('keeps demo and test wording out of the rendered V Bank controls', async () => {
    useSimulatorStore.setState({ flow: vBankFlow })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ mode: 'fake', ready: true, recipient: '••••4567', allowedFlowIds: [vBankFlow.metadata.id], storage: 'development file store', errors: [] }),
    }))

    render(<LiveRcsControls />)

    expect(await screen.findByText(/Flow passes strict Live RCS preflight/i)).toBeInTheDocument()
    expect(screen.getByText('Live RCS', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText(/demo|fictional|test/i)).not.toBeInTheDocument()
  })
})
