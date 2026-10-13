import { useEffect, useId, useState } from 'react'
import { Play } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { ImageWithFallback } from '../components/common/ImageWithFallback'
import { FormattedText } from '../components/common/FormattedText'
import { useSimulatorStore } from '../store/simulatorStore'
import { mediaUrl, validatedMediaSource } from '../utils/mediaUrl'

interface VideoMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
  interactive: boolean
}

type VideoNormalizedMessage = Omit<NormalizedMessage, 'message'> & {
  message: Extract<NormalizedMessage['message'], { type: 'video' }>
}

export function VideoMessage({ message, channel, timestampLabel, interactive }: VideoMessageProps) {
  if (message.message.type !== 'video') return null
  if (channel === 'rcs') {
    return <RcsVideoMessage message={message as VideoNormalizedMessage} timestampLabel={timestampLabel} />
  }
  return <LegacyVideoMessage message={message} channel={channel} timestampLabel={timestampLabel} interactive={interactive} />
}

function RcsVideoMessage({ message, timestampLabel }: { message: VideoNormalizedMessage; timestampLabel?: string }) {
  const { sender, url, thumbnailUrl, caption, durationLabel } = message.message
  const source = mediaUrl(url)
  const poster = mediaUrl(thumbnailUrl)
  const fallbackThumbnail = validatedMediaSource(thumbnailUrl)
  const [mediaError, setMediaError] = useState(!source)
  const captionId = useId()
  const durationId = useId()

  useEffect(() => {
    setMediaError(!source)
  }, [source])

  const describedBy = [caption ? captionId : '', durationLabel ? durationId : ''].filter(Boolean).join(' ') || undefined

  return (
    <MessageShell sender={sender ?? 'business'} channel="rcs" chrome="card" timestampLabel={timestampLabel}>
      <div className="relative block h-48 w-full overflow-hidden bg-slate-100">
        {mediaError ? (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600" role="status" aria-label="Video unavailable">
            {fallbackThumbnail && (
              <ImageWithFallback src={fallbackThumbnail} alt={caption ?? 'Video preview'} className="absolute inset-0 h-full w-full object-cover opacity-60" />
            )}
            <span className="relative rounded bg-white/90 px-2 py-1 text-xs font-medium shadow-sm">Video unavailable</span>
          </div>
        ) : (
          <video
            className="h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
            src={source}
            {...(poster ? { poster } : {})}
            aria-label={caption?.trim() || 'Video'}
            {...(describedBy ? { 'aria-describedby': describedBy } : {})}
            onError={() => setMediaError(true)}
          />
        )}
        {durationLabel && (
          <span id={durationId} className="pointer-events-none absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 text-[11px] text-white rounded">
            {durationLabel}
          </span>
        )}
      </div>
      {caption && (
        <p id={captionId} className="px-3 py-2 text-[13.5px] text-slate-700 m-0">
          <FormattedText text={caption} />
        </p>
      )}
    </MessageShell>
  )
}

function LegacyVideoMessage({ message, channel, timestampLabel, interactive }: VideoMessageProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  if (message.message.type !== 'video') return null
  const { sender, thumbnailUrl, caption, durationLabel } = message.message

  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <button
        type="button"
        className="relative w-full h-48 block group cursor-pointer"
        onClick={interactive ? () => showToast('Video playback is not available in this simulator') : undefined}
        aria-label="Play video preview"
        disabled={!interactive}
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
      {caption && (
        <p className="px-3 py-2 text-[13.5px] text-slate-700 m-0">
          <FormattedText text={caption} />
        </p>
      )}
    </MessageShell>
  )
}
