import { PencilLine } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'

interface InputMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

export function InputMessage({ message, channel, interactive, timestampLabel }: InputMessageProps) {
  if (message.message.type !== 'input') return null
  const { placeholder } = message.message

  return (
    <MessageShell sender="business" channel={channel} chrome="bubble" timestampLabel={timestampLabel}>
      <div className="flex items-center gap-2 text-[13.5px] text-slate-600">
        <PencilLine size={15} className="text-slate-400 shrink-0" />
        <span>
          {placeholder ?? 'Please reply below.'}
          {interactive && <span className="text-slate-400"> — reply using the box below.</span>}
        </span>
      </div>
    </MessageShell>
  )
}
