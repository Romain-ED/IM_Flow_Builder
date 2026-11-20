import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LiveLogsView } from './LiveLogsView'

describe('LiveLogsView', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('summarizes provider errors and can narrow the list to issues', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generatedAt: '2026-11-20T00:33:00.000Z',
        session: null,
        diagnostics: [
          { id: '1', at: '2026-11-20T00:32:12.960Z', type: 'webhook_processed', sessionStatus: 'awaiting_reply' },
          { id: '2', at: '2026-11-20T00:32:56.841Z', type: 'provider_status', status: 'rejected', providerStatus: 'rejected', providerCode: '1380', providerDetail: 'Invalid resource' },
          { id: '3', at: '2026-11-20T00:32:42.203Z', type: 'inbound_unmatched', reason: 'No matching interaction correlation.' },
        ],
      }),
    }))

    render(<LiveLogsView sessionId="sess-1" />)

    expect(await screen.findByText('1 error recorded')).toBeTruthy()
    expect(screen.getByText('Latest error: Provider status: rejected')).toBeTruthy()
    expect(screen.getByText(/Vonage could not fetch a media URL/)).toBeTruthy()
    expect(screen.getByText('Webhook processed')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Show issues only'))

    expect(screen.queryByText('Webhook processed')).toBeNull()
    expect(screen.getByText('Provider status: rejected')).toBeTruthy()
    expect(screen.getByText('Inbound message not matched')).toBeTruthy()
  })
})
