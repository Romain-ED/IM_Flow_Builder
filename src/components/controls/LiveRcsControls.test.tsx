import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { flowDefinitionSchema } from '../../schema/flow'
import { useSimulatorStore } from '../../store/simulatorStore'
import { LiveRcsControls } from './LiveRcsControls'

const rcsFlow = flowDefinitionSchema.parse({
  version: '1',
  metadata: { id: 'live-test', name: 'Live test', channel: 'rcs' },
  brand: { name: 'Demo' },
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
})
