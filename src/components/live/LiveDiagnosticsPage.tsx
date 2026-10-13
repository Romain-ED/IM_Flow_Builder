import { useEffect, useState } from 'react'
import { AlertCircle, Check, ClipboardList, Copy, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { copyToClipboard } from '../../utils/shareLink'

type LiveSessionRecord = {
  id: string
  status: string
  recipient: string
  currentNodeId?: string | null
  createdAt?: string
  updatedAt?: string
  eventCount?: number
  outboundCount?: number
}

type LiveLogs = {
  generatedAt: string
  session: LiveSessionRecord | null
  diagnostics: Array<Record<string, unknown>>
}

async function request<T>(path: string, token: string): Promise<T> {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({})) as T & { error?: string | { message?: string } }
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message ?? `Live RCS request failed (${response.status}).`)
  return body
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export function LiveDiagnosticsPage() {
  const [token, setToken] = useState('')
  const [sessions, setSessions] = useState<LiveSessionRecord[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [logs, setLogs] = useState<LiveLogs | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadSessions() {
    if (!token) {
      setError('Enter the operator access token used to start the live session.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const nextSessions = await request<LiveSessionRecord[]>('/api/live/sessions', token)
      setSessions(nextSessions)
      setSelectedSessionId((current) => current && nextSessions.some((session) => session.id === current) ? current : nextSessions[0]?.id ?? '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load live sessions.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setLogs(null)
    if (!token || !selectedSessionId) return
    let cancelled = false
    const refresh = async () => {
      try {
        const nextLogs = await request<LiveLogs>(`/api/live/logs?sessionId=${encodeURIComponent(selectedSessionId)}`, token)
        if (!cancelled) setLogs(nextLogs)
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
  }, [selectedSessionId, token])

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

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-indigo-700">
            <ClipboardList size={20} />
            <h2 className="text-lg font-semibold text-slate-900 m-0">Live RCS logs</h2>
          </div>
          <p className="text-[13px] leading-5 text-slate-600 m-0 max-w-3xl">
            Load a session to inspect the complete webhook and delivery timeline. Copy the diagnostics JSON and send it for troubleshooting.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-start gap-2 text-[12px] text-slate-600">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>The operator token is used only for this page request and is never included in copied diagnostics.</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[11.5px] font-medium text-slate-600">Operator access token</span>
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste the token used for the live run"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <button type="button" onClick={() => void loadSessions()} disabled={isLoading || !token} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />} Load sessions
            </button>
          </div>
          {sessions.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] font-medium text-slate-600">Session</span>
              <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.status.replaceAll('_', ' ')} · {session.currentNodeId ?? 'no node'} · {session.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {sessions.length === 0 && token && !isLoading && <p className="text-[12px] text-slate-500 m-0">No sessions loaded yet. Click “Load sessions”.</p>}
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {logs?.session && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 m-0">Selected session</p>
                <code className="text-[12px] text-slate-800 break-all">{logs.session.id}</code>
              </div>
              <button type="button" onClick={() => void copyLogs()} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12.5px] font-medium text-indigo-700 hover:bg-indigo-100 cursor-pointer">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy diagnostics'}
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[12px]">
              <div className="rounded-md bg-slate-50 px-2.5 py-2"><dt className="text-slate-400">Status</dt><dd className="m-0 font-medium text-slate-800">{logs.session.status}</dd></div>
              <div className="rounded-md bg-slate-50 px-2.5 py-2"><dt className="text-slate-400">Current node</dt><dd className="m-0 font-mono text-slate-800 break-all">{logs.session.currentNodeId ?? '—'}</dd></div>
              <div className="rounded-md bg-slate-50 px-2.5 py-2"><dt className="text-slate-400">Events</dt><dd className="m-0 font-medium text-slate-800">{logs.session.eventCount ?? 0}</dd></div>
              <div className="rounded-md bg-slate-50 px-2.5 py-2"><dt className="text-slate-400">Outbound messages</dt><dd className="m-0 font-medium text-slate-800">{logs.session.outboundCount ?? 0}</dd></div>
            </dl>
          </section>
        )}

        {logs && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-slate-900 m-0">Sanitized diagnostics</h3>
              <span className="text-[11px] text-slate-400">Auto-refreshes every 2.5 seconds</span>
            </div>
            {logs.diagnostics.length > 0 ? (
              <ol className="flex flex-col gap-2 list-none p-0 m-0">
                {logs.diagnostics.slice().reverse().map((entry, index) => (
                  <li key={`${String(entry.id ?? 'entry')}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                      <strong className="text-slate-800">{formatValue(entry.type)}</strong>
                      {entry.at != null ? <time className="text-slate-400">{String(entry.at)}</time> : null}
                      {entry.error != null ? <span className="text-rose-700">{String(entry.error)}</span> : null}
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] leading-4 text-slate-600 m-0">{JSON.stringify(entry, null, 2)}</pre>
                  </li>
                ))}
              </ol>
            ) : <p className="text-[12px] text-slate-500 m-0">No webhook diagnostics have been recorded for this session.</p>}
            <details>
              <summary className="text-[12px] font-medium text-indigo-700 cursor-pointer">Show complete copy payload</summary>
              <pre className="mt-2 max-h-[32rem] overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-4 text-slate-100 whitespace-pre-wrap break-all">{JSON.stringify(logs, null, 2)}</pre>
            </details>
          </section>
        )}
      </div>
    </main>
  )
}
