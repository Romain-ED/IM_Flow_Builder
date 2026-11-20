import { useEffect, useState } from 'react'
import { AlertCircle, Check, Copy } from 'lucide-react'
import { copyToClipboard } from '../../utils/shareLink'
import { liveRequest, type LiveLogs } from './liveApi'
import { describeDiagnostic, type DiagnosticSeverity } from './liveDiagnostics'

const ROW_STYLE: Record<DiagnosticSeverity, string> = {
  error: 'border-rose-200 border-l-rose-500 bg-rose-50',
  warning: 'border-amber-200 border-l-amber-500 bg-amber-50',
  success: 'border-emerald-200 border-l-emerald-500 bg-white',
  info: 'border-slate-200 border-l-slate-300 bg-slate-50',
}

const BADGE: Record<DiagnosticSeverity, { label: string; className: string }> = {
  error: { label: 'Error', className: 'bg-rose-600 text-white' },
  warning: { label: 'Warning', className: 'bg-amber-500 text-white' },
  success: { label: 'OK', className: 'bg-emerald-600 text-white' },
  info: { label: 'Info', className: 'bg-slate-200 text-slate-700' },
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/**
 * Webhook and delivery timeline for one live session, refreshed every 2.5 seconds.
 * Shared by the Live logs page and the RCS messages panel. `compact` fits a narrow
 * side panel: one-column summary, wrapped text instead of mid-word breaks.
 */
export function LiveLogsView({ sessionId, compact = false }: { sessionId: string; compact?: boolean }) {
  const [logs, setLogs] = useState<LiveLogs | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [issuesOnly, setIssuesOnly] = useState(false)

  useEffect(() => {
    setLogs(null)
    setError(null)
    if (!sessionId) return
    let cancelled = false
    const refresh = async () => {
      try {
        const nextLogs = await liveRequest<LiveLogs>(`/api/live/logs?sessionId=${encodeURIComponent(sessionId)}`)
        if (!cancelled) {
          setLogs(nextLogs)
          setError(null)
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load live diagnostics.')
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2_500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [sessionId])

  async function copyLogs() {
    if (!logs) return
    const didCopy = await copyToClipboard(JSON.stringify(logs, null, 2))
    if (!didCopy) {
      setError('Clipboard access was denied. Select and copy the diagnostics JSON manually.')
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  const card = compact
    ? 'rounded-lg border border-slate-200 bg-white p-3'
    : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
  const wrap = compact ? 'break-words' : 'break-all'
  const body = compact ? 'text-[11.5px] leading-5' : 'text-[11px] leading-4'

  // Newest first. Errors and warnings are classified once here and drive the summary, the filter, and the row styling.
  const described = (logs?.diagnostics ?? []).slice().reverse().map((entry, index) => ({ entry, index, view: describeDiagnostic(entry) }))
  const errorCount = described.filter(({ view }) => view.severity === 'error').length
  const warningCount = described.filter(({ view }) => view.severity === 'warning').length
  const latestIssue = described.find(({ view }) => view.severity === 'error') ?? described.find(({ view }) => view.severity === 'warning')
  const shown = issuesOnly ? described.filter(({ view }) => view.severity === 'error' || view.severity === 'warning') : described
  const summaryTone = errorCount > 0
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : warningCount > 0
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  const summaryText = errorCount > 0
    ? `${plural(errorCount, 'error')} recorded`
    : warningCount > 0
      ? `${plural(warningCount, 'warning')}, no errors`
      : 'No errors or warnings recorded'

  return (
    <>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span className={`min-w-0 ${wrap}`}>{error}</span>
        </div>
      )}

      {logs?.session && (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 m-0">Selected session</p>
              <code className={`text-[12px] text-slate-800 ${wrap}`}>{logs.session.id}</code>
            </div>
            <button type="button" onClick={() => void copyLogs()} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12.5px] font-medium text-indigo-700 hover:bg-indigo-100 cursor-pointer">
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy diagnostics'}
            </button>
          </div>
          <dl className={`mt-3 grid grid-cols-2 ${compact ? '' : 'lg:grid-cols-4'} gap-2 text-[12px]`}>
            <div className="rounded-md bg-slate-50 px-2.5 py-2 min-w-0"><dt className="text-slate-400">Status</dt><dd className={`m-0 font-medium text-slate-800 ${wrap}`}>{logs.session.status}</dd></div>
            <div className="rounded-md bg-slate-50 px-2.5 py-2 min-w-0"><dt className="text-slate-400">Current node</dt><dd className={`m-0 font-mono text-slate-800 ${wrap}`}>{logs.session.currentNodeId ?? '—'}</dd></div>
            <div className="rounded-md bg-slate-50 px-2.5 py-2"><dt className="text-slate-400">Events</dt><dd className="m-0 font-medium text-slate-800">{logs.session.eventCount ?? 0}</dd></div>
            <div className="rounded-md bg-slate-50 px-2.5 py-2"><dt className="text-slate-400">Outbound messages</dt><dd className="m-0 font-medium text-slate-800">{logs.session.outboundCount ?? 0}</dd></div>
          </dl>
        </section>
      )}

      {logs && (
        <section className={`${card} flex flex-col gap-3`}>
          <div className={`rounded-lg border px-3 py-2 text-[12.5px] ${summaryTone}`}>
            <p className="m-0 font-semibold">{summaryText}</p>
            {latestIssue && <p className="m-0 mt-0.5">Latest {latestIssue.view.severity === 'error' ? 'error' : 'warning'}: {latestIssue.view.title}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-col">
              <h3 className="text-[13px] font-semibold text-slate-900 m-0">Sanitized diagnostics</h3>
              <span className="text-[11px] text-slate-400">Auto-refreshes every 2.5 seconds</span>
            </div>
            <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-700 cursor-pointer">
              <input type="checkbox" checked={issuesOnly} onChange={(event) => setIssuesOnly(event.target.checked)} className="accent-indigo-600" />
              Show issues only
            </label>
          </div>
          {shown.length > 0 ? (
            <ol className="flex flex-col gap-2 list-none p-0 m-0">
              {shown.map(({ entry, index, view }) => (
                <li key={`${String(entry.id ?? 'entry')}-${index}`} className={`min-w-0 rounded-lg border border-l-4 px-3 py-2 ${ROW_STYLE[view.severity]}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE[view.severity].className}`}>{BADGE[view.severity].label}</span>
                    <strong className={`font-semibold text-slate-900 ${wrap}`}>{view.title}</strong>
                    {entry.at != null ? <time className="text-[11px] text-slate-400">{String(entry.at)}</time> : null}
                  </div>
                  {view.detail ? <p className={`m-0 mt-1 text-[12px] text-slate-700 ${wrap}`}>{view.detail}</p> : null}
                  {view.hint ? <p className="m-0 mt-1 text-[12px] font-medium text-slate-800">{view.hint}</p> : null}
                  <details className="mt-1.5">
                    <summary className="text-[11px] text-slate-500 cursor-pointer">Raw entry</summary>
                    <pre className={`mt-1 whitespace-pre-wrap ${wrap} ${body} text-slate-600 m-0`}>{JSON.stringify(entry, null, 2)}</pre>
                  </details>
                </li>
              ))}
            </ol>
          ) : <p className="text-[12px] text-slate-500 m-0">{logs.diagnostics.length > 0 ? 'No issues recorded.' : 'No diagnostics have been recorded yet.'}</p>}
          <details>
            <summary className="text-[12px] font-medium text-indigo-700 cursor-pointer">Show complete copy payload</summary>
            <pre className={`mt-2 ${compact ? 'max-h-96' : 'max-h-[32rem]'} overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-4 text-slate-100 whitespace-pre-wrap ${wrap}`}>{JSON.stringify(logs, null, 2)}</pre>
          </details>
        </section>
      )}
    </>
  )
}
