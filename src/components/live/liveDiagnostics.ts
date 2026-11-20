export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'success'

export type DiagnosticView = {
  severity: DiagnosticSeverity
  title: string
  detail: string | null
  hint: string | null
}

/** What a Vonage error code usually means and what to check. Codes come from the status callback's `error.title`. */
const PROVIDER_CODE_HINTS: Record<string, string> = {
  '1260': 'The number cannot receive RCS. Check that it is RCS-capable and listed as a tester for this RCS agent.',
  '1300': 'The number is not on the RCS provider network.',
  '1310': 'The device cannot receive this message.',
  '1330': 'Vonage reported a permanent delivery failure. Read the detail text.',
  '1380': 'Vonage could not fetch a media URL. The file must be public HTTPS and load without sign-in.',
  '1381': 'A media file is too large for RCS.',
  '1382': 'A media file has a type RCS does not support.',
}

const FAILED_PROVIDER_STATUSES = new Set(['rejected', 'undeliverable', 'failed'])
const DELIVERED_PROVIDER_STATUSES = new Set(['delivered', 'read'])
const ERROR_TYPES = new Set(['webhook_error', 'inbound_rejected', 'inbox_write_error', 'always_on_flow_load_error'])
const WARNING_TYPES = new Set(['inbound_unmatched', 'inbound_unmatched_session', 'auto_start_skipped'])

const LABELS: Record<string, string> = {
  webhook_received: 'Webhook received',
  webhook_processed: 'Webhook processed',
  webhook_duplicate: 'Duplicate webhook ignored',
  webhook_error: 'Webhook failed',
  provider_status: 'Provider delivery status',
  inbound_received: 'Inbound message received',
  inbound_routed: 'Inbound message routed',
  inbound_unmatched: 'Inbound message not matched',
  inbound_unmatched_session: 'Inbound message has no session',
  inbound_rejected: 'Inbound message rejected',
  inbound_duplicate: 'Duplicate inbound ignored',
  inbox_write_error: 'Could not store inbound message',
  auto_start_skipped: 'Auto-start skipped',
  auto_start_session_created: 'Session auto-started',
  auto_start_replaced_sessions: 'Earlier sessions replaced',
  always_on_flow_load_error: 'Always-on flow failed to load',
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Turns one sanitized diagnostic entry into a severity, a readable title, and an optional hint. */
export function describeDiagnostic(entry: Record<string, unknown>): DiagnosticView {
  const type = text(entry.type) ?? 'unknown'
  const title = LABELS[type] ?? type
  const error = text(entry.error)
  const reason = text(entry.reason)

  if (type === 'provider_status') {
    const status = text(entry.status) ?? 'updated'
    const code = text(entry.providerCode)
    const detail = text(entry.providerDetail)
    return {
      severity: FAILED_PROVIDER_STATUSES.has(status) ? 'error' : DELIVERED_PROVIDER_STATUSES.has(status) ? 'success' : 'info',
      title: `Provider status: ${text(entry.providerStatus) ?? status}`,
      detail: code ? `Vonage code ${code}${detail ? `: ${detail}` : ''}` : detail,
      hint: code ? PROVIDER_CODE_HINTS[code] ?? null : null,
    }
  }
  if (error) return { severity: 'error', title, detail: error, hint: null }
  if (ERROR_TYPES.has(type)) return { severity: 'error', title, detail: reason, hint: null }
  if (WARNING_TYPES.has(type)) return { severity: 'warning', title, detail: reason, hint: null }
  if (type === 'webhook_processed') {
    const sessionStatus = text(entry.sessionStatus)
    return { severity: 'info', title, detail: sessionStatus ? `Session status: ${sessionStatus.replaceAll('_', ' ')}` : null, hint: null }
  }
  return { severity: 'info', title, detail: reason, hint: null }
}
