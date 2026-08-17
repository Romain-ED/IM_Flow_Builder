import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell, type TrailingActionItem } from '../components/phone/MessageShell'
import { FormattedText } from '../components/common/FormattedText'

interface TextMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
  deliveryState?: 'sent' | 'delivered' | 'read'
  /** A node's trailing `actions`, or a merged suggested_replies/suggested_actions message — rendered attached, not floating. */
  trailingActions?: TrailingActionItem[]
}

export function TextMessage({ message, channel, timestampLabel, deliveryState, trailingActions }: TextMessageProps) {
  if (message.message.type !== 'text') return null
  const { sender, text } = message.message
  return (
    <MessageShell
      sender={sender ?? 'business'}
      channel={channel}
      chrome="bubble"
      timestampLabel={timestampLabel}
      deliveryState={deliveryState}
      trailingActions={trailingActions}
    >
      <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words m-0">
        <FormattedText text={text} />
      </p>
    </MessageShell>
  )
}
