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
  const isRcsMoreOptions = channel === 'rcs' && text.trim() === 'More options:'
  return (
    <MessageShell
      sender={sender ?? 'business'}
      channel={channel}
      chrome={isRcsMoreOptions ? 'none' : 'bubble'}
      timestampLabel={timestampLabel}
      deliveryState={deliveryState}
      trailingActions={trailingActions}
      className={isRcsMoreOptions ? 'py-0.5' : ''}
    >
      {isRcsMoreOptions ? (
        <span className="inline-flex items-center rounded-full border border-[#cdb8e3] bg-[#eee5fa] px-3.5 py-1.5 text-[12px] font-medium text-[#68458f] shadow-sm">
          More options:
        </span>
      ) : (
        <p className="m-0 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed">
          <FormattedText text={text} />
        </p>
      )}
    </MessageShell>
  )
}
