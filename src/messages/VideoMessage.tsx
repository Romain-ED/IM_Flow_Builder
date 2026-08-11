import { Play } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { ImageWithFallback } from '../components/common/ImageWithFallback'
import { useSimulatorStore } from '../store/simulatorStore'

interface VideoMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
}

export function VideoMessage({ message, channel, timestampLabel }: VideoMessageProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  if (message.message.type !== 'video') return null
  const { sender, thumbnailUrl, caption, durationLabel } = message.message

  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <button
        type="button"
        className="relative w-full h-48 block group cursor-pointer"
        onClick={() => showToast('Video playback is not available in this simulator')}
        aria-label="Play video preview"
      >
        <ImageWithFallback src={thumbnailUrl} alt={caption ?? 'Video preview'} className="w-full h-full object-cover" />
        <span className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow">
            <Play size={20} className="text-slate-900 translate-x-0.5" fill="currentColor" />
          </span>
        </span>
        {durationLabel && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded">
            {durationLabel}
          </span>
        )}
      </button>
      {caption && <p className="px-3 py-2 text-[13.5px] text-slate-700 m-0">{caption}</p>}
    </MessageShell>
  )
}
