import { Plane } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'

interface FlightCardProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
}

export function FlightCard({ message, channel, timestampLabel }: FlightCardProps) {
  if (message.message.type !== 'flight_card') return null
  const { flightNumber, airline, origin, destination, departureTime, arrivalTime, date, terminal, gate, status } =
    message.message

  return (
    <MessageShell sender="business" channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 m-0">{airline}</p>
            <p className="text-[15px] font-semibold text-slate-900 m-0">{flightNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 m-0">{date}</p>
            {status && (
              <span className="inline-block mt-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900 m-0">{origin.code}</p>
            <p className="text-[12px] text-slate-500 m-0">{origin.city}</p>
          </div>
          <div className="flex-1 flex flex-col items-center px-3">
            <p className="text-[11px] text-slate-400 m-0">{departureTime}</p>
            <div className="w-full flex items-center gap-1 my-1">
              <span className="h-px flex-1 bg-slate-300" />
              <Plane size={14} className="text-slate-400 rotate-90" />
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <p className="text-[11px] text-slate-400 m-0">{arrivalTime}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 m-0">{destination.code}</p>
            <p className="text-[12px] text-slate-500 m-0">{destination.city}</p>
          </div>
        </div>

        {(terminal || gate) && (
          <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
            {terminal && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 m-0">Terminal</p>
                <p className="text-[13px] font-medium text-slate-800 m-0">{terminal}</p>
              </div>
            )}
            {gate && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 m-0">Gate</p>
                <p className="text-[13px] font-medium text-slate-800 m-0">{gate}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MessageShell>
  )
}
