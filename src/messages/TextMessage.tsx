import type { ChannelId } from '../schema/flow'
import type { Choice } from '../schema/messages'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'

interface TextMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
  deliveryState?: 'sent' | 'delivered' | 'read'
  /** A node's trailing `actions`, when this is the last message before them — rendered attached, not floating. */
  trailingActions?: { choices: Choice[]; onSelect: (choice: Choice) => void }
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

function renderFormattedText(text: string) {
  return text.split('\n').map((line, lineIndex) => {
    const parts = line.split(URL_PATTERN)
    return (
      <span key={lineIndex} className="block">
        {parts.map((part, i) =>
          URL_PATTERN.test(part) ? (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 break-all"
              onClick={(e) => e.preventDefault()}
            >
              {part}
            </a>
          ) : (
            renderInlineFormatting(part, i)
          ),
        )}
        {line === '' && ' '}
      </span>
    )
  })
}

/** Very small, safe **bold** / *italic* renderer — no HTML injection, no markdown lib. */
function renderInlineFormatting(text: string, key: number) {
  const tokens = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean)
  return (
    <span key={key}>
      {tokens.map((token, i) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={i}>{token.slice(2, -2)}</strong>
        }
        if (token.startsWith('_') && token.endsWith('_')) {
          return <em key={i}>{token.slice(1, -1)}</em>
        }
        return <span key={i}>{token}</span>
      })}
    </span>
  )
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
        {renderFormattedText(text)}
      </p>
    </MessageShell>
  )
}
