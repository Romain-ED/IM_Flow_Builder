import type { ReactNode } from 'react'
import type { ChannelId } from '../../schema/flow'
import type { Choice, Sender } from '../../schema/messages'
import { channelThemes } from '../../channels/theme'

interface TrailingActions {
  choices: Choice[]
  onSelect: (choice: Choice) => void
}

interface MessageShellProps {
  sender: Sender
  channel: ChannelId
  chrome: 'bubble' | 'card' | 'none'
  interactive?: boolean
  timestampLabel?: string
  deliveryState?: 'sent' | 'delivered' | 'read'
  children: ReactNode
  className?: string
  /**
   * Buttons that belong to *this* message — e.g. a node's trailing
   * `actions`, folded into whichever message they logically follow —
   * rendered as a divided footer inside this same card/bubble, never as a
   * separate floating element. A real WhatsApp interactive message always
   * carries header/body/footer/buttons as one message object; there's no
   * "buttons as their own message" concept on the real platform.
   */
  trailingActions?: TrailingActions
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
  trailingActions,
}: MessageShellProps) {
  const theme = channelThemes[channel]
  const isUser = sender === 'user'
  const hasTrailingActions = Boolean(trailingActions && trailingActions.choices.length > 0)

  const containerClasses =
    chrome === 'bubble'
      ? `${theme.bubbleRadius} overflow-hidden ${isUser ? theme.userBubble : theme.businessBubble}`
      : chrome === 'card'
        ? `${theme.cardRadius} overflow-hidden bg-white border border-slate-200 shadow-sm`
        : ''
  // When chrome is 'bubble', padding used to live directly on the bubble div
  // (it had nothing else to share space with). Trailing actions need their
  // own unpadded, full-width rows, so padding moves to a content wrapper
  // instead, leaving the outer card free for a flush divided footer.
  const contentPadding = chrome === 'bubble' ? 'px-3.5 py-2.5' : ''

  // The width cap lives on this flex item (not on the bubble div inside it):
  // percentages on a flex item's max-width resolve against the row's own
  // definite width, whereas a percentage on a plain block child resolves
  // against its parent's — here indeterminate — width and silently fails to
  // constrain anything, letting long messages overflow the phone frame.
  const wrapperMaxWidth = chrome === 'bubble' ? 'max-w-[82%]' : chrome === 'card' ? 'max-w-[86%]' : 'max-w-full'

  return (
    <div
      className={`flex w-full animate-message-in ${isUser ? 'justify-end' : 'justify-start'} ${!interactive ? 'opacity-60' : ''} ${className}`}
    >
      <div className={`flex flex-col gap-1 shrink-0 ${wrapperMaxWidth}`}>
        {chrome === 'none' ? (
          children
        ) : (
          <div className={containerClasses}>
            <div className={contentPadding}>{children}</div>
            {hasTrailingActions && (
              <div className="flex flex-col border-t border-slate-200/80">
                {trailingActions!.choices.map((choice, i) => (
                  <button
                    key={choice.value ?? choice.label ?? i}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && trailingActions!.onSelect(choice)}
                    className={`px-4 py-2.5 text-[13.5px] font-medium text-center transition-colors ${theme.chipText} ${
                      i > 0 ? 'border-t border-slate-200/80' : ''
                    } ${interactive ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
