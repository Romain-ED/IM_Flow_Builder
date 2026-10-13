import { FileText, Download } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { useSimulatorStore } from '../store/simulatorStore'

interface DocumentMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  timestampLabel?: string
  interactive: boolean
}

export function DocumentMessage({ message, channel, timestampLabel, interactive }: DocumentMessageProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  if (message.message.type !== 'document') return null
  const { sender, filename, title, description, fileType } = message.message
  if (channel === 'rcs') {
    // Google Messages file preview (no thumbnail): grey preview area, a red
    // file-type badge with the file name, then title/description on the tint.
    const label = (fileType ?? 'FILE').toUpperCase()
    return (
      <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel} tinted>
        <button
          type="button"
          className="block w-full bg-[#f1f0f0] px-4 pb-3 pt-4 text-left cursor-pointer disabled:cursor-not-allowed"
          onClick={interactive ? () => showToast(`${filename} downloaded`) : undefined}
          disabled={!interactive}
        >
          <span className="mb-3 flex justify-center text-slate-300">
            <FileText size={26} aria-hidden="true" />
          </span>
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e0352b] text-[11px] font-bold text-white">
              {label.slice(0, 4)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-slate-900">{filename}</span>
              <span className="block text-[12.5px] text-slate-600">{label}</span>
            </span>
          </span>
        </button>
        {(title || description) && (
          <div className="px-4 pb-4 pt-3">
            {title && <p className="m-0 text-[15px] font-semibold leading-snug text-slate-900">{title}</p>}
            {description && <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-slate-600">{description}</p>}
          </div>
        )}
      </MessageShell>
    )
  }

  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <button
        type="button"
        className="flex items-center gap-3 w-full p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={interactive ? () => showToast(`${filename} downloaded`) : undefined}
        disabled={!interactive}
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
