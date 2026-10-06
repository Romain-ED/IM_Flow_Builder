import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, Radio, Square, WifiOff } from 'lucide-react'
import { preflightLiveRcsFlow, type LiveRcsIssue } from '../../live/rcsPreflight'
import { useSimulatorStore } from '../../store/simulatorStore'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'

interface LiveDiagnostics {
  mode: 'disabled' | 'fake' | 'vonage'
  ready: boolean
  recipient: string | null
  allowedFlowIds: string[]
  storage: string
  errors: string[]
}

interface LiveEvent {
  id: string
  at: string
  type: string
  status?: string
  text?: string
  recognized?: boolean
}

interface LiveSession {
  id: string
  status: string
  recipient: string
  events: LiveEvent[]
}

function publicBaseUrl() {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

function eventLabel(event: LiveEvent): string {
  if (event.type === 'status') return `${event.status ?? 'updated'} status`
  if (event.type === 'inbound_text') return event.recognized ? `Phone: ${event.text}` : `Phone (unmatched): ${event.text}`
  return event.type.replaceAll('_', ' ')
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `Live RCS request failed (${response.status}).`)
  return body
}

export function LiveRcsControls() {
  const flow = useSimulatorStore((state) => state.flow)
  const configuredVariables = useSimulatorStore((state) => state.configuredVariables)
  const channel = useSimulatorStore((state) => state.channel)
  const liveSessionActive = useSimulatorStore((state) => state.liveSessionActive)
  const setLiveSessionActive = useSimulatorStore((state) => state.setLiveSessionActive)
  const [diagnostics, setDiagnostics] = useState<LiveDiagnostics | null>(null)
  const [operatorToken, setOperatorToken] = useState('')
  const [session, setSession] = useState<LiveSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  const liveFlow = useMemo(() => flow ? { ...flow, variables: { ...(flow.variables ?? {}), ...configuredVariables } } : null, [configuredVariables, flow])
  const preflight = useMemo(() => liveFlow && liveFlow.metadata.channel === 'rcs'
    ? preflightLiveRcsFlow(liveFlow, { publicBaseUrl: publicBaseUrl() })
    : null, [liveFlow])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/live/diagnostics')
      .then((response) => response.json())
      .then((body: LiveDiagnostics) => { if (!cancelled) setDiagnostics(body) })
      .catch(() => { if (!cancelled) setError('Live RCS diagnostics are unavailable.') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (!session?.id || !liveSessionActive) return
    let cancelled = false
    const poll = async () => {
      try {
        const next = await api<LiveSession>(`/api/live/sessions/${session.id}`, operatorToken)
        if (!cancelled) setSession(next)
      } catch (pollError) {
        if (!cancelled) setError(pollError instanceof Error ? pollError.message : 'Could not refresh the live session.')
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 2_500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [liveSessionActive, operatorToken, session?.id])

  async function start() {
    if (!liveFlow || !diagnostics?.ready || !preflight?.success || !operatorToken || offline) return
    if (!window.confirm(`Start a live RCS demo to ${diagnostics.recipient}? This sends real messages when Vonage mode is configured.`)) return
    setIsLoading(true)
    setError(null)
    try {
      const started = await api<LiveSession>('/api/live/sessions', operatorToken, {
        method: 'POST',
        body: JSON.stringify({ flow: liveFlow, variables: configuredVariables }),
      })
      setSession(started)
      setLiveSessionActive(true)
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Could not start the live session.')
    } finally {
      setIsLoading(false)
    }
  }

  async function stop() {
    if (!session || !operatorToken) return
    setIsLoading(true)
    try {
      const stopped = await api<LiveSession>(`/api/live/sessions/${session.id}/stop`, operatorToken, { method: 'POST' })
      setSession(stopped)
      setLiveSessionActive(false)
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Could not stop the live session.')
    } finally {
      setIsLoading(false)
    }
  }

  const issues: LiveRcsIssue[] = preflight?.errors ?? []
  const needsRcsScenario = Boolean(flow && flow.metadata.channel !== 'rcs')
  const canStart = Boolean(diagnostics?.ready && preflight?.success && operatorToken && !offline && !session && channel === 'rcs')

  return (
    <div className="flex flex-col gap-2.5">
      <SectionHeading accent={sectionAccents.inspector}>Live RCS demo</SectionHeading>
      {offline && <Notice icon={WifiOff} tone="amber">Live mode requires a network connection.</Notice>}
      {!diagnostics && !error && <p className="text-[12px] text-slate-500 m-0">Checking server readiness…</p>}
      {diagnostics && !diagnostics.ready && (
        <Notice icon={CircleAlert} tone="amber">
          Live RCS is disabled. {diagnostics.errors[0] ?? 'Configure the VCR server environment first.'}
        </Notice>
      )}
      {diagnostics?.ready && (
        <>
          <p className="text-[12px] leading-4 text-slate-600 m-0">
            <span className="font-medium text-slate-800">{diagnostics.mode === 'fake' ? 'Fake transport' : 'Fixed test phone'}:</span>{' '}
            {diagnostics.recipient} · {diagnostics.storage}
          </p>
          {needsRcsScenario && <Notice icon={CircleAlert} tone="amber">Load an RCS-authored scenario before starting Live RCS.</Notice>}
          {channel !== 'rcs' && <Notice icon={CircleAlert} tone="amber">Switch the simulator channel to RCS before starting a live run.</Notice>}
          {preflight && !preflight.success && (
            <Notice icon={CircleAlert} tone="rose">
              Live preflight found {issues.length} issue{issues.length === 1 ? '' : 's'}: {issues.slice(0, 2).map((issue) => issue.message).join(' ')}
            </Notice>
          )}
          {preflight?.success && !session && <Notice icon={CircleCheck} tone="emerald">Flow passes strict Live RCS preflight.</Notice>}
          {!session && (
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] text-slate-500">Operator access token (not stored)</span>
              <input
                type="password"
                autoComplete="off"
                value={operatorToken}
                onChange={(event) => setOperatorToken(event.target.value)}
                placeholder="Paste access token"
                className="rounded-md border border-slate-200 px-2 py-1.5 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </label>
          )}
          {session ? (
            <>
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-[12px] text-indigo-800">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{session.status.replaceAll('_', ' ')}</span><span className="font-mono text-[10px]">{session.id.slice(0, 8)}</span></div>
                <ol className="mt-1.5 max-h-24 overflow-y-auto list-none p-0 m-0 space-y-0.5">
                  {session.events.slice(-5).reverse().map((entry) => <li key={entry.id} className="truncate">• {eventLabel(entry)}</li>)}
                </ol>
              </div>
              <button type="button" onClick={() => void stop()} disabled={isLoading} className="flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 cursor-pointer">
                <Square size={12} fill="currentColor" /> Stop live session
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void start()} disabled={!canStart || isLoading} className="flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              {isLoading ? <LoaderCircle size={13} className="animate-spin" /> : <Radio size={13} />} Start live RCS
            </button>
          )}
        </>
      )}
      {error && <Notice icon={CircleAlert} tone="rose">{error}</Notice>}
    </div>
  )
}

function Notice({ icon: Icon, tone, children }: { icon: typeof CircleAlert; tone: 'amber' | 'rose' | 'emerald'; children: ReactNode }) {
  const classes = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'
  return <p className={`flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11.5px] leading-4 m-0 ${classes}`}><Icon size={13} className="mt-0.5 shrink-0" />{children}</p>
}
