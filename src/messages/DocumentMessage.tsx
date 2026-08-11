import { FileText, Download } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { useSimulatorStore } from '../store/simulatorStore'

interface DocumentMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
}

export function DocumentMessage({ message, channel, timestampLabel }: DocumentMessageProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  if (message.message.type !== 'document') return null
  const { sender, filename, title, description, fileType } = message.message

  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <button
        type="button"
        className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={() => showToast(`${filename} downloaded`)}
      >
        <span className="h-11 w-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <FileText size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-slate-900 truncate">{title ?? filename}</span>
          {description && <span className="block text-[12.5px] text-slate-500 truncate">{description}</span>}
          <span className="block text-[11px] text-slate-400 uppercase tracking-wide mt-0.5">
            {fileType ?? 'FILE'} · {filename}
          </span>
        </span>
        <Download size={18} className="text-slate-400 shrink-0" />
      </button>
    </MessageShell>
  )
}
