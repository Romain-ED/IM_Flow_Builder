import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { optionAnchor } from '../engine/flowAnchors'
import { ChoiceChips } from '../components/phone/ChoiceChips'
import { useSimulatorStore } from '../store/simulatorStore'
import { useChartMessageIndex } from './chartAnchorContext'

interface SuggestedRepliesProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
}

export function SuggestedReplies({ message, channel, interactive }: SuggestedRepliesProps) {
  const handleChoice = useSimulatorStore((s) => s.handleChoice)
  const messageIndex = useChartMessageIndex()
  if (message.message.type !== 'suggested_replies') return null
  const anchors =
    messageIndex === null ? undefined : message.message.options.map((_, j) => optionAnchor(messageIndex, j))
  return (
    <div className="flex w-full justify-end pr-1">
      <ChoiceChips
        choices={message.message.options}
        channel={channel}
        interactive={interactive}
        onSelect={handleChoice}
        ariaLabel="Suggested replies"
        anchors={anchors}
      />
    </div>
  )
}
