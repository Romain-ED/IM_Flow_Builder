import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'

interface InputMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

// Deliberately just a plain text bubble — no icon, no "reply using the box
// below" hint. `input` is chosen over the invented `otp` type specifically
// because it renders as an ordinary WhatsApp/RCS text message with nothing
// claiming a structured UI; any visual cue here would undercut that (see
// CLAUDE.md's "Official vs. invented message types" section).
export function InputMessage({ message, channel, timestampLabel }: InputMessageProps) {
  if (message.message.type !== 'input') return null
  const { placeholder } = message.message

  return (
    <MessageShell sender="business" channel={channel} chrome="bubble" timestampLabel={timestampLabel}>
      <span className="text-[13.5px] text-slate-600">{placeholder ?? 'Please reply below.'}</span>
    </MessageShell>
  )
}
