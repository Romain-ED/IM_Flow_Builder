import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { channelCapabilities } from '../channels/registry'
import { getFallbackNote, isMessageTypeSupported } from '../channels/capabilities'
import { isMessageInteractive } from '../utils/selectors'
import { useSimulatorStore } from '../store/simulatorStore'
import { formatTime } from '../utils/time'
import { TextMessage } from './TextMessage'
import { ImageMessage } from './ImageMessage'
import { VideoMessage } from './VideoMessage'
import { DocumentMessage } from './DocumentMessage'
import { RichCard } from './RichCard'
import { Carousel } from './Carousel'
import { SuggestedReplies } from './SuggestedReplies'
import { SuggestedActions } from './SuggestedActions'
import { ListMessage } from './ListMessage'
import { InputMessage } from './InputMessage'
import { FlightCard } from './FlightCard'
import { BoardingPass } from './BoardingPass'
import { AlertTriangle } from 'lucide-react'

interface MessageRendererProps {
  message: NormalizedMessage
  channel: ChannelId
}

export function MessageRenderer({ message, channel }: MessageRendererProps) {
  const currentNodeId = useSimulatorStore((s) => s.currentNodeId)
  const debugWarningsEnabled = useSimulatorStore((s) => s.debugWarningsEnabled)
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const showTimestamps = useSimulatorStore((s) => s.flow?.defaults?.showTimestamps ?? true)
  const locale = useSimulatorStore((s) => s.flow?.defaults?.locale)

  const interactive = isMessageInteractive(message, currentNodeId)
  const capabilities = channelCapabilities[channel]
  const supported = isMessageTypeSupported(capabilities, message.message.type)
  const showFallbackNote = !supported && debugWarningsEnabled && !presenterMode
  const timestampLabel = showTimestamps ? formatTime(message.timestamp, locale) : undefined
  const deliveryState = message.message.sender === 'user' ? 'read' : undefined

  return (
    <div className="flex flex-col gap-1 w-full">
      {showFallbackNote && (
        <div className="flex items-start gap-1.5 pl-1 text-[11px] text-amber-700 max-w-[86%]">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{getFallbackNote(capabilities, message.message.type)}</span>
        </div>
      )}
      {renderContent(message, channel, interactive, timestampLabel, deliveryState)}
    </div>
  )
}

function renderContent(
  message: NormalizedMessage,
  channel: ChannelId,
  interactive: boolean,
  timestampLabel: string | undefined,
  deliveryState: 'read' | undefined,
) {
  switch (message.message.type) {
    case 'text':
      return <TextMessage message={message} channel={channel} timestampLabel={timestampLabel} deliveryState={deliveryState} />
    case 'image':
      return <ImageMessage message={message} channel={channel} timestampLabel={timestampLabel} />
    case 'video':
      return <VideoMessage message={message} channel={channel} timestampLabel={timestampLabel} />
    case 'document':
      return <DocumentMessage message={message} channel={channel} timestampLabel={timestampLabel} />
    case 'rich_card':
      return <RichCard message={message} channel={channel} interactive={interactive} timestampLabel={timestampLabel} />
    case 'carousel':
      return <Carousel message={message} channel={channel} interactive={interactive} />
    case 'suggested_replies':
      return <SuggestedReplies message={message} channel={channel} interactive={interactive} />
    case 'suggested_actions':
      return <SuggestedActions message={message} channel={channel} interactive={interactive} />
    case 'list':
      return <ListMessage message={message} channel={channel} interactive={interactive} timestampLabel={timestampLabel} />
    case 'input':
      return <InputMessage message={message} channel={channel} interactive={interactive} timestampLabel={timestampLabel} />
    case 'flight_card':
      return <FlightCard message={message} channel={channel} timestampLabel={timestampLabel} />
    case 'boarding_pass':
      return <BoardingPass message={message} channel={channel} interactive={interactive} timestampLabel={timestampLabel} />
    default:
      return null
  }
}
