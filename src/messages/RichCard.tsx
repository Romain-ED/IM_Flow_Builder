import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { ImageWithFallback } from '../components/common/ImageWithFallback'
import { ActionButton } from '../components/phone/ActionButton'

interface RichCardProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

const MEDIA_HEIGHTS: Record<string, string> = { short: 'h-28', medium: 'h-44', tall: 'h-64' }

export function RichCard({ message, channel, interactive, timestampLabel }: RichCardProps) {
  if (message.message.type !== 'rich_card') return null
  const { sender, image, title, description, mediaHeight, actions } = message.message
  const heightClass = MEDIA_HEIGHTS[mediaHeight ?? 'medium']

  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      {image && <ImageWithFallback src={image} alt={title} className={`w-full ${heightClass} object-cover block`} />}
      <div className="p-3.5">
        <h4 className="text-[14.5px] font-semibold text-slate-900 m-0">{title}</h4>
        {description && <p className="text-[13px] text-slate-600 mt-1 mb-0">{description}</p>}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex flex-col">
          {actions.map((action, i) => (
            <ActionButton key={i} action={action} channel={channel} interactive={interactive} variant="block" />
          ))}
        </div>
      )}
    </MessageShell>
  )
}
