import { useMemo } from 'react'
import { Activity, CircleAlert, LoaderCircle } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

function formatActivity(activity: { at: string; preview: string; kind: string } | null): string {
  if (!activity) return 'No activity recorded'
  return `${activity.preview} · ${new Date(activity.at).toLocaleTimeString()}`
}

export function LiveStateIndicator() {
  const active = useSimulatorStore((state) => state.liveSessionActive)
  const projection = useSimulatorStore((state) => state.liveProjection)
  const syncState = useSimulatorStore((state) => state.liveSyncState)
  const flow = useSimulatorStore((state) => state.flow)

  const nodeLabel = useMemo(() => {
    if (!projection?.currentNodeId) return 'Unavailable'
    const node = flow?.nodes.find((candidate) => candidate.id === projection.currentNodeId)
    return node?.label ? `${node.label} (${projection.currentNodeId})` : projection.currentNodeId
  }, [flow?.nodes, projection?.currentNodeId])

  if (!active) return null

  const latestActivity = [projection?.activity.latestInbound, projection?.activity.latestOutbound, projection?.activity.latestProvider]
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0] ?? null

  return (
    <div className="shrink-0 border-b border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] text-indigo-900" aria-label="Live session state">
      <div className="flex items-center gap-1.5 font-medium">
        {projection ? <Activity size={13} /> : <LoaderCircle size={13} className="animate-spin" />}
        <span>Live mirror</span>
        <span className="font-normal text-indigo-700">· {projection?.status.replaceAll('_', ' ') ?? 'loading'}</span>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-indigo-700">
        <span>Node: {nodeLabel}</span>
        {projection?.pendingInput && <span>Input: {projection.pendingInput.inputType}</span>}
        <span className="truncate">Latest: {formatActivity(latestActivity)}</span>
      </div>
      {syncState === 'stale' && <div className="mt-1 flex items-center gap-1 text-amber-700"><CircleAlert size={12} /> Stale — showing the last valid live snapshot.</div>}
      {syncState === 'error' && <div className="mt-1 flex items-center gap-1 text-rose-700"><CircleAlert size={12} /> Live state unavailable.</div>}
    </div>
  )
}
