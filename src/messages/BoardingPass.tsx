import { Plane } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { DEFAULT_BOARDING_PASS_ACTIONS } from '../schema/messages'
import { MessageShell } from '../components/phone/MessageShell'
import { QrPlaceholder, BarcodePlaceholder } from '../components/common/CodePlaceholder'
import { useSimulatorStore } from '../store/simulatorStore'

interface BoardingPassProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
  compact?: boolean
}

export function BoardingPass({ message, channel, interactive, timestampLabel, compact }: BoardingPassProps) {
  const handleBoardingPassAction = useSimulatorStore((s) => s.handleBoardingPassAction)
  if (message.message.type !== 'boarding_pass') return null
  const bp = message.message
  const actions = bp.actions ?? DEFAULT_BOARDING_PASS_ACTIONS

  const content = (
    <div className="bg-white">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <span className="text-[13.5px] font-semibold">{bp.airline}</span>
        <span className="text-[10.5px] tracking-wide text-slate-300">BOARDING PASS</span>
      </div>

      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900 m-0 leading-none">{bp.origin.code}</p>
          <p className="text-[11px] text-slate-500 m-0 mt-1">{bp.origin.city}</p>
        </div>
        <Plane size={16} className="text-slate-300 rotate-90 shrink-0" />
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900 m-0 leading-none">{bp.destination.code}</p>
          <p className="text-[11px] text-slate-500 m-0 mt-1">{bp.destination.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-y-3 px-4 pb-3 border-b border-dashed border-slate-200">
        <Field label="Passenger" value={bp.passengerName} span={2} />
        <Field label="Flight" value={bp.flightNumber} />
        <Field label="Date" value={bp.date} />
        <Field label="Boards" value={bp.boardingTime ?? '—'} />
        <Field label="Gate" value={bp.gate ?? '—'} />
        <Field label="Terminal" value={bp.terminal ?? '—'} />
        <Field label="Seat" value={bp.seat || '—'} />
        <Field label="Group" value={bp.boardingGroup ?? '—'} />
        <Field label="Class" value={bp.cabinClass ?? '—'} />
        {bp.frequentFlyerStatus && <Field label="Status" value={bp.frequentFlyerStatus} span={2} />}
      </div>

      {!compact && (
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 m-0">Booking ref</p>
            <p className="text-[16px] font-bold text-slate-900 m-0 tracking-wide">{bp.bookingReference}</p>
            <div className="mt-2">
              <BarcodePlaceholder seed={bp.bookingReference} width={140} height={34} />
            </div>
          </div>
          <QrPlaceholder seed={bp.bookingReference} size={80} />
        </div>
      )}
    </div>
  )

  if (compact) return content

  return (
    <MessageShell sender="business" channel={channel} chrome="card" timestampLabel={timestampLabel}>
      {content}
      <div className="flex flex-col border-t border-slate-100">
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && handleBoardingPassAction(action, message)}
            className={`w-full py-2.5 text-[13.5px] font-medium transition-colors ${i > 0 ? 'border-t border-slate-100' : ''} ${
              interactive ? 'text-slate-700 hover:bg-slate-50 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </MessageShell>
  )
}

function Field({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${span} / span ${span}` }}>
      <p className="text-[9.5px] uppercase tracking-wide text-slate-400 m-0">{label}</p>
      <p className="text-[13px] font-semibold text-slate-800 m-0 truncate">{value}</p>
    </div>
  )
}
