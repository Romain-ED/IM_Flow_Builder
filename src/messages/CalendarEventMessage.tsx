import { CalendarPlus } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { useSimulatorStore } from '../store/simulatorStore'

interface CalendarEventMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

export function CalendarEventMessage({ message, channel, interactive, timestampLabel }: CalendarEventMessageProps) {
  const simulateCardAction = useSimulatorStore((s) => s.simulateCardAction)
  if (message.message.type !== 'calendar_event') return null
  const { title, description, startTime, endTime, location, next, set } = message.message

  return (
    <MessageShell sender="business" channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <div className="p-3.5 flex items-start gap-3">
        <span className="h-9 w-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <CalendarPlus size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-slate-900 m-0">{title}</p>
          <p className="text-[12px] text-slate-500 mt-0.5 mb-0">
            {startTime}
            {endTime ? ` – ${endTime}` : ''}
          </p>
          {location && <p className="text-[12px] text-slate-500 mt-0.5 mb-0">{location}</p>}
          {description && <p className="text-[12px] text-slate-500 mt-1 mb-0">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        disabled={!interactive}
        onClick={() => interactive && simulateCardAction('Added to calendar (simulated)', next, set)}
        className={`w-full py-2.5 text-[13.5px] font-semibold border-t border-slate-100 transition-colors ${
          interactive ? 'text-violet-700 hover:bg-violet-50 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
        }`}
      >
        Add to calendar
      </button>
    </MessageShell>
  )
}
