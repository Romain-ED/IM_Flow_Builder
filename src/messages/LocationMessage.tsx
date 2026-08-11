import { MapPin } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { useSimulatorStore } from '../store/simulatorStore'

interface LocationMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

/** Deterministic decorative "map" pattern — no maps API/dependency involved. */
function MapPreview({ seed }: { seed: string }) {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const roads = Array.from({ length: 5 }, (_, i) => {
    h = (h * 1664525 + 1013904223) >>> 0
    return (h % 100) + i * 20
  })
  return (
    <svg viewBox="0 0 300 130" className="w-full h-32 block" preserveAspectRatio="none" aria-hidden="true">
      <rect width="300" height="130" fill="#eaf3ea" />
      {roads.map((y, i) => (
        <line key={i} x1={0} y1={y % 130} x2={300} y2={(y * 1.3) % 130} stroke="#cfe0cf" strokeWidth={6} />
      ))}
      <circle cx="150" cy="65" r="9" fill="#dc2626" />
      <circle cx="150" cy="65" r="3.5" fill="white" />
    </svg>
  )
}

export function LocationMessage({ message, channel, interactive, timestampLabel }: LocationMessageProps) {
  const handleAction = useSimulatorStore((s) => s.handleAction)
  if (message.message.type !== 'location') return null
  const { label, address } = message.message

  return (
    <MessageShell sender="business" channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <MapPreview seed={address ?? label} />
      <div className="p-3.5 flex items-start gap-2.5">
        <span className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <MapPin size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-slate-900 m-0">{label}</p>
          {address && <p className="text-[12px] text-slate-500 mt-0.5 mb-0">{address}</p>}
        </div>
      </div>
      <button
        type="button"
        disabled={!interactive}
        onClick={() =>
          interactive && handleAction({ type: 'location', label: 'Open in Maps', address, query: label })
        }
        className={`w-full py-2.5 text-[13.5px] font-medium border-t border-slate-100 transition-colors ${
          interactive ? 'text-rose-600 hover:bg-slate-50 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
        }`}
      >
        Open in Maps
      </button>
    </MessageShell>
  )
}
