import type { ChannelId } from '../../schema/flow'
import { channelThemes } from '../../channels/theme'

export function TypingIndicator({ channel }: { channel: ChannelId }) {
  const theme = channelThemes[channel]
  return (
    <div className="flex w-full justify-start" aria-live="polite" aria-label="Business is typing">
      <div className={`${theme.bubbleRadius} ${theme.businessBubble} px-4 py-3 flex items-center gap-1`}>
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
