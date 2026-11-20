import { describe, expect, it } from 'vitest'
import { describeDiagnostic } from './liveDiagnostics'

describe('describeDiagnostic', () => {
  it('marks a rejected provider status as an error and explains the Vonage code', () => {
    const view = describeDiagnostic({ type: 'provider_status', status: 'rejected', providerStatus: 'rejected', providerCode: '1380', providerDetail: 'Invalid resource' })
    expect(view.severity).toBe('error')
    expect(view.title).toBe('Provider status: rejected')
    expect(view.detail).toBe('Vonage code 1380: Invalid resource')
    expect(view.hint).toMatch(/public HTTPS/)
  })

  it('marks delivered provider statuses as OK and unknown statuses as info', () => {
    expect(describeDiagnostic({ type: 'provider_status', status: 'delivered' }).severity).toBe('success')
    expect(describeDiagnostic({ type: 'provider_status', status: 'updated' }).severity).toBe('info')
  })

  it('treats failed webhooks and rejected inbound messages as errors with their text', () => {
    expect(describeDiagnostic({ type: 'webhook_error', error: 'No Live RCS session matches this status callback.' })).toMatchObject({
      severity: 'error',
      title: 'Webhook failed',
      detail: 'No Live RCS session matches this status callback.',
    })
    expect(describeDiagnostic({ type: 'inbound_rejected' }).severity).toBe('error')
  })

  it('treats unmatched inbound messages as warnings with the reason', () => {
    expect(describeDiagnostic({ type: 'inbound_unmatched', reason: 'No matching interaction correlation.' })).toMatchObject({
      severity: 'warning',
      title: 'Inbound message not matched',
      detail: 'No matching interaction correlation.',
    })
  })

  it('shows the session status for processed webhooks without calling it a provider status', () => {
    expect(describeDiagnostic({ type: 'webhook_processed', sessionStatus: 'awaiting_reply' })).toMatchObject({
      severity: 'info',
      detail: 'Session status: awaiting reply',
    })
  })

  it('falls back to the raw type name for unknown entries', () => {
    expect(describeDiagnostic({ type: 'inbound_webhook' })).toMatchObject({ severity: 'info', title: 'inbound_webhook' })
  })
})
