import { ListIcon } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { channelThemes } from '../channels/theme'
import { useSimulatorStore } from '../store/simulatorStore'

interface ListMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

export function ListMessage({ message, channel, interactive, timestampLabel }: ListMessageProps) {
  const openListSheet = useSimulatorStore((s) => s.openListSheet)
  const theme = channelThemes[channel]
  if (message.message.type !== 'list') return null
  const { sender, title, description, buttonLabel } = message.message

  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <div className="p-3.5 flex items-start gap-3">
        <span className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
          <ListIcon size={18} />
        </span>
        <div className="min-w-0">
          <h4 className="text-[14px] font-semibold text-slate-900 m-0">{title}</h4>
          {description && <p className="text-[12.5px] text-slate-500 mt-0.5 mb-0">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        disabled={!interactive}
        onClick={() => interactive && openListSheet(message)}
        className={`w-full py-2.5 text-[13.5px] font-medium border-t border-slate-100 transition-colors ${theme.chipText} ${interactive ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
      >
        {buttonLabel}
      </button>
    </MessageShell>
  )
}
