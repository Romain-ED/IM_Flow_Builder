import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { ImageWithFallback } from '../components/common/ImageWithFallback'

interface ImageMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
}

export function ImageMessage({ message, channel, timestampLabel }: ImageMessageProps) {
  if (message.message.type !== 'image') return null
  const { sender, url, alt, caption } = message.message
  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <ImageWithFallback
        src={url}
        alt={alt ?? caption ?? 'Image'}
        className="w-full h-48 object-cover block"
      />
      {caption && <p className="px-3 py-2 text-[13.5px] text-slate-700 m-0">{caption}</p>}
    </MessageShell>
  )
}
