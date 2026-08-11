import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { ActionButton } from '../components/phone/ActionButton'

interface SuggestedActionsProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
}

export function SuggestedActions({ message, channel, interactive }: SuggestedActionsProps) {
  if (message.message.type !== 'suggested_actions') return null
  return (
    <div className="flex w-full justify-start pl-1">
      <div className="flex flex-wrap gap-2" aria-label="Suggested actions">
        {message.message.actions.map((action, i) => (
          <ActionButton key={i} action={action} channel={channel} interactive={interactive} variant="chip" />
        ))}
      </div>
    </div>
  )
}
