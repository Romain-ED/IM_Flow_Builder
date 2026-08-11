import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { ChoiceChips } from '../components/phone/ChoiceChips'
import { useSimulatorStore } from '../store/simulatorStore'

interface SuggestedRepliesProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
}

export function SuggestedReplies({ message, channel, interactive }: SuggestedRepliesProps) {
  const handleChoice = useSimulatorStore((s) => s.handleChoice)
  if (message.message.type !== 'suggested_replies') return null
  return (
    <div className="flex w-full justify-start pl-1">
      <ChoiceChips
        choices={message.message.options}
        channel={channel}
        interactive={interactive}
        onSelect={handleChoice}
        ariaLabel="Suggested replies"
      />
    </div>
  )
}
