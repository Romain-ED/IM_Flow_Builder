import { useState } from 'react'
import { AlertCircle, ClipboardList, LoaderCircle, RefreshCw } from 'lucide-react'
import { LiveLogsView } from './LiveLogsView'
import { liveRequest, type LiveSessionRecord } from './liveApi'

export function LiveDiagnosticsPage() {
  const [sessions, setSessions] = useState<LiveSessionRecord[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadSessions() {
    setIsLoading(true)
    setError(null)
    try {
      const nextSessions = await liveRequest<LiveSessionRecord[]>('/api/live/sessions')
      setSessions(nextSessions)
      setSelectedSessionId((current) => current && nextSessions.some((session) => session.id === current) ? current : nextSessions[0]?.id ?? '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load live sessions.')
    } finally {
      setIsLoading(false)
    }
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
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <button type="button" onClick={() => void loadSessions()} disabled={isLoading} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
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
          {sessions.length === 0 && !isLoading && <p className="text-[12px] text-slate-500 m-0">No sessions loaded yet. Click “Load sessions”.</p>}
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <LiveLogsView sessionId={selectedSessionId} />
      </div>
    </main>
  )
}
