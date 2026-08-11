import type { ReactNode } from 'react'
import type { ChannelId } from '../../schema/flow'
import type { Sender } from '../../schema/messages'
import { channelThemes } from '../../channels/theme'

interface MessageShellProps {
  sender: Sender
  channel: ChannelId
  chrome: 'bubble' | 'card' | 'none'
  interactive?: boolean
  timestampLabel?: string
  deliveryState?: 'sent' | 'delivered' | 'read'
  children: ReactNode
  className?: string
}

export function MessageShell({
  sender,
  channel,
  chrome,
  interactive = true,
  timestampLabel,
  deliveryState,
  children,
  className = '',
}: MessageShellProps) {
  const theme = channelThemes[channel]
  const isUser = sender === 'user'

  const bubbleClasses =
    chrome === 'bubble'
      ? `${theme.bubbleRadius} px-3.5 py-2.5 ${isUser ? theme.userBubble : theme.businessBubble} max-w-[82%]`
      : chrome === 'card'
        ? `${theme.cardRadius} overflow-hidden bg-white border border-slate-200 shadow-sm max-w-[86%]`
        : ''

  return (
    <div
      className={`flex w-full animate-message-in ${isUser ? 'justify-end' : 'justify-start'} ${!interactive ? 'opacity-60' : ''} ${className}`}
    >
      <div className="flex flex-col gap-1" style={{ maxWidth: chrome === 'none' ? '100%' : undefined }}>
        <div className={bubbleClasses}>{children}</div>
        {timestampLabel && (
          <div
            className={`flex items-center gap-1 text-[11px] text-slate-400 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <span>{timestampLabel}</span>
            {isUser && deliveryState && <DeliveryTicks state={deliveryState} />}
          </div>
        )}
      </div>
    </div>
  )
}

function DeliveryTicks({ state }: { state: 'sent' | 'delivered' | 'read' }) {
  const color = state === 'read' ? 'text-sky-500' : 'text-slate-400'
  return (
    <svg
      viewBox="0 0 16 10"
      className={`h-2.5 w-4 ${color}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 5.5 4 8.5 9 2" />
      {state !== 'sent' && <path d="M7 5.5 10 8.5 15 2" />}
    </svg>
  )
}
