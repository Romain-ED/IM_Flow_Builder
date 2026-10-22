import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, Radio, RotateCcw, Square, WifiOff } from 'lucide-react'
import { preflightLiveRcsFlow, type LiveRcsIssue } from '../../live/rcsPreflight'
import { flowDefinitionSchema } from '../../schema/flow'
import { parseFlowSource } from '../../utils/flowSource'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { LiveProjection, LiveSnapshot } from '../../live/liveSessionProjection'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkField, darkFocusRing, darkNotices, darkSolids, darkSurface, darkTints } from '../../utils/darkChrome'

interface LiveDiagnostics {
  mode: 'disabled' | 'fake' | 'vonage'
  ready: boolean
  recipient: string | null
  allowedFlowIds: string[]
  storage: string
  errors: string[]
}

type LiveSession = LiveSnapshot

function activityLabel(activity: LiveProjection['activity']['latestInbound']): string {
  if (!activity) return '—'
  return `${activity.preview} · ${new Date(activity.at).toLocaleTimeString()}`
}
function publicBaseUrl() {
  return typeof window === 'undefined' ? undefined : window.location.origin
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
  const body = await response.json().catch(() => ({})) as T & { error?: string | { message?: string }; liveSnapshot?: unknown; id?: string }
  if (!response.ok) {
    const error = new Error(typeof body.error === 'string' ? body.error : body.error?.message ?? `Live RCS request failed (${response.status}).`)
    if (body.liveSnapshot) Object.assign(error, { liveSnapshot: body.liveSnapshot, id: (body as T & { id?: string }).id })
    throw error
  }
  return body
}

export function LiveRcsControls() {
  const flow = useSimulatorStore((state) => state.flow)
  const configuredVariables = useSimulatorStore((state) => state.configuredVariables)
  const channel = useSimulatorStore((state) => state.channel)
  const liveSessionActive = useSimulatorStore((state) => state.liveSessionActive)
  const liveProjection = useSimulatorStore((state) => state.liveProjection)
  const liveSyncState = useSimulatorStore((state) => state.liveSyncState)
  const syncLiveSnapshot = useSimulatorStore((state) => state.syncLiveSnapshot)
  const markLiveProjectionStale = useSimulatorStore((state) => state.markLiveProjectionStale)
  const setLiveSessionActive = useSimulatorStore((state) => state.setLiveSessionActive)
  const setLiveSessionCredentials = useSimulatorStore((state) => state.setLiveSessionCredentials)
  const [diagnostics, setDiagnostics] = useState<LiveDiagnostics | null>(null)
  const [operatorToken, setOperatorToken] = useState('')
  const [destinationPhone, setDestinationPhone] = useState('')
  const [session, setSession] = useState<LiveSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const isVBank = flow?.metadata.id === 'vbank-multifinance-first-repayment'
  const isRcsDemoMenu = flow?.metadata.id === 'rcs-demo-menu'
  const persistenceKey = flow?.metadata.id ? `bmfs.live-demo.phone.${flow.metadata.id}` : 'bmfs.live-demo.phone'

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(persistenceKey)
      if (saved !== null) setDestinationPhone(saved)
    } catch { /* storage may be unavailable in private browsing */ }
  }, [persistenceKey])

  useEffect(() => {
    try { window.localStorage.setItem(persistenceKey, destinationPhone) } catch { /* best effort persistence */ }
  }, [destinationPhone, persistenceKey])

  const liveFlow = useMemo(() => flow ? { ...flow, variables: { ...(flow.variables ?? {}), ...configuredVariables } } : null, [configuredVariables, flow])
  const rcsCatalog = useMemo(() => BUILT_IN_SCENARIOS.flatMap((scenario) => {
    if (scenario.id === 'rcs-demo-menu') return []
    const parsed = parseFlowSource(scenario.source, 'yaml')
    if (!parsed.success) return []
    const result = flowDefinitionSchema.safeParse(parsed.data)
    return result.success && result.data.metadata.channel === 'rcs' ? [{ id: scenario.id, flow: result.data }] : []
  }), [])
  const catalogIssues = useMemo(() => isRcsDemoMenu
    ? rcsCatalog.flatMap((entry) => preflightLiveRcsFlow(entry.flow, { publicBaseUrl: publicBaseUrl() }).errors.map((issue) => ({ ...issue, nodeId: `${entry.id}/${issue.nodeId}` })))
    : [], [isRcsDemoMenu, rcsCatalog])
  const preflight = useMemo(() => liveFlow && liveFlow.metadata.channel === 'rcs'
    ? preflightLiveRcsFlow(liveFlow, { publicBaseUrl: publicBaseUrl() })
    : null, [liveFlow])
  const nodeLabel = liveProjection?.currentNodeId
    ? flow?.nodes.find((node) => node.id === liveProjection.currentNodeId)?.label
    : undefined
  const liveStatus = liveProjection?.status ?? session?.status

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
        if (!cancelled) {
          setSession(next)
          syncLiveSnapshot(next)
        }
      } catch (pollError) {
        if (!cancelled) {
          markLiveProjectionStale(pollError instanceof Error ? pollError.message : 'Could not refresh the live session.')
          setError(pollError instanceof Error ? pollError.message : 'Could not refresh the live session.')
        }
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 2_500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [liveSessionActive, markLiveProjectionStale, operatorToken, session?.id, syncLiveSnapshot])

  async function start() {
    if (!liveFlow || !diagnostics?.ready || !preflight?.success || !operatorToken || offline) return
    const selectedRecipient = destinationPhone.trim() || diagnostics.recipient
    const confirmation = isVBank
      ? `Start a live RCS session for ${selectedRecipient}? This sends real messages when Vonage mode is configured.`
      : `Start a live RCS demo to ${selectedRecipient}? This sends real messages when Vonage mode is configured.`
    if (!window.confirm(confirmation)) return
    setIsLoading(true)
    setError(null)
    try {
      const started = await api<LiveSession>('/api/live/sessions', operatorToken, {
        method: 'POST',
        body: JSON.stringify({
          flow: liveFlow,
          variables: configuredVariables,
          ...(isRcsDemoMenu ? { catalog: rcsCatalog } : {}),
          ...(destinationPhone.trim() ? { recipient: destinationPhone.trim() } : {}),
        }),
      })
      setSession(started)
      setLiveSessionCredentials(started.id, operatorToken)
      syncLiveSnapshot(started)
      setLiveSessionActive(true)
    } catch (startError) {
      const recovery = startError as Error & { liveSnapshot?: LiveSnapshot; id?: string }
      if (recovery.liveSnapshot && recovery.id) {
        setSession(recovery.liveSnapshot)
        setLiveSessionCredentials(recovery.id, operatorToken)
        syncLiveSnapshot(recovery.liveSnapshot)
        setLiveSessionActive(true)
      }
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

  async function resetDemo() {
    setError(null)
    setIsLoading(false)
    setSession(null)
    setLiveSessionActive(false)
    setLiveSessionCredentials(null)
    setDestinationPhone('')
    try { window.localStorage.removeItem(persistenceKey) } catch { /* best effort */ }
    useSimulatorStore.getState().clearLiveProjection()
    useSimulatorStore.getState().restart()
  }

  const issues: LiveRcsIssue[] = preflight?.errors ?? []
  const needsRcsScenario = Boolean(flow && flow.metadata.channel !== 'rcs')
  const canStart = Boolean(diagnostics?.ready && preflight?.success && catalogIssues.length === 0 && operatorToken && !offline && !session && channel === 'rcs')
  const vBankModeNotice = diagnostics?.mode === 'fake'
    ? 'Messages remain in this browser until a live provider is configured.'
    : 'Messages are sent through the configured RCS service when available.'

  return (
    <div className="flex flex-col gap-2.5">
      <SectionHeading accent={sectionAccents.inspector} tone="dark">{isVBank ? 'Live RCS' : 'Live RCS demo'}</SectionHeading>
      <p className={`flex items-center gap-1.5 rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-1.5 text-[11.5px] leading-4 ${darkNotices.indigo}`} role="status">
        <Radio size={13} aria-hidden="true" /> {isVBank ? vBankModeNotice : 'Demo mode — simulated interaction unless a live provider is configured.'}
      </p>
      {isLoading && <p className={`flex items-center gap-1.5 text-[12px] m-0 ${darkSurface.body}`} role="status" aria-live="polite"><LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> Working…</p>}
      {offline && <Notice icon={WifiOff} tone="amber">Live mode requires a network connection.</Notice>}
      {!diagnostics && !error && <p className={`text-[12px] m-0 ${darkSurface.muted}`}>Checking server readiness…</p>}
      {diagnostics && !diagnostics.ready && (
        <Notice icon={CircleAlert} tone="amber">
          Live RCS is disabled. {diagnostics.errors[0] ?? 'Configure the VCR server environment first.'}
        </Notice>
      )}
      {diagnostics?.ready && (
        <>
          <p className={`text-[12px] leading-4 m-0 ${darkSurface.body}`}>
            <span className="font-medium text-white">{diagnostics.mode === 'fake' ? 'Fake transport' : isVBank ? 'Configured recipient' : 'Configured fallback number'}:</span>{' '}
            {diagnostics.recipient} · {diagnostics.storage}
          </p>
          {needsRcsScenario && <Notice icon={CircleAlert} tone="amber">Load an RCS-authored scenario before starting Live RCS.</Notice>}
          {channel !== 'rcs' && <Notice icon={CircleAlert} tone="amber">Switch the simulator channel to RCS before starting a live run.</Notice>}
          {preflight && !preflight.success && (
            <Notice icon={CircleAlert} tone="rose">
              Live preflight found {issues.length} issue{issues.length === 1 ? '' : 's'}: {issues.slice(0, 2).map((issue) => issue.message).join(' ')}
            </Notice>
          )}
          {isRcsDemoMenu && catalogIssues.length > 0 && (
            <Notice icon={CircleAlert} tone="rose">
              A selectable RCS scenario failed Live preflight: {catalogIssues[0].message}
            </Notice>
          )}
          {preflight?.success && !session && <Notice icon={CircleCheck} tone="emerald">Flow passes strict Live RCS preflight.</Notice>}
          {!session && (
            <>
              <label className="flex flex-col gap-1">
                <span className={`text-[11.5px] ${darkSurface.muted}`}>Destination phone number</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={destinationPhone}
                  onChange={(event) => setDestinationPhone(event.target.value)}
                  placeholder="e.g. + country code + number"
                  className={darkField}
                />
                <span className={`text-[11px] leading-4 ${darkSurface.muted}`}>{isVBank ? 'Enter a server-authorized recipient number. Leave blank to use the configured recipient.' : 'Enter any 7–15 digit testing-user number. Leave blank to use the server-configured fallback.'}</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className={`text-[11.5px] ${darkSurface.muted}`}>Operator access token (not stored)</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={operatorToken}
                  onChange={(event) => setOperatorToken(event.target.value)}
                  placeholder="Paste access token"
                  className={darkField}
                />
              </label>
            </>
          )}
          <button type="button" onClick={() => void resetDemo()} disabled={isLoading} className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium ${darkTints.slate} ${darkFocusRing} disabled:opacity-40 cursor-pointer`}>
            <RotateCcw size={13} /> {isVBank ? 'Reset session' : 'Reset demo'}
          </button>
          {session ? (
            <>
              <div className={`rounded-md border px-2.5 py-2 text-[12px] ${darkNotices.indigo}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{liveStatus?.replaceAll('_', ' ')}</span><span className="font-mono text-[10px]">{session.id.slice(0, 8)}</span></div>
                {liveStatus === 'awaiting_trigger' && flow?.metadata.trigger && <p className="mt-1 m-0">Waiting for the destination phone to send the exact trigger: <strong>{flow.metadata.trigger}</strong></p>}
                <p className="mt-1 m-0">Node: {nodeLabel ? `${nodeLabel} · ` : ''}<span className="font-mono">{liveProjection?.currentNodeId ?? 'unavailable'}</span></p>
                <p className="mt-1 m-0 truncate">Inbound: {activityLabel(liveProjection?.activity.latestInbound ?? null)}</p>
                <p className="mt-1 m-0 truncate">Outbound: {activityLabel(liveProjection?.activity.latestOutbound ?? null)}</p>
                {liveProjection?.activity.latestProvider && <p className="mt-1 m-0 truncate">Provider: {activityLabel(liveProjection.activity.latestProvider)}</p>}
                {liveSyncState === 'stale' && <p className="mt-1 m-0 text-amber-300">Live view is stale; retaining the last valid snapshot.</p>}
                {liveSyncState === 'error' && <p className="mt-1 m-0 text-rose-300">Live view is unavailable until a valid snapshot arrives.</p>}
              </div>
              <button type="button" onClick={() => void stop()} disabled={isLoading} className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium ${darkTints.rose} ${darkFocusRing} disabled:opacity-40 cursor-pointer`}>
                <Square size={12} fill="currentColor" /> Stop live session
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void start()} disabled={!canStart || isLoading} className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium ${darkSolids.teal} ${darkFocusRing} disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}>
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
  const classes = darkNotices[tone]
  return <p className={`flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11.5px] leading-4 m-0 ${classes}`}><Icon size={13} className="mt-0.5 shrink-0" />{children}</p>
}
