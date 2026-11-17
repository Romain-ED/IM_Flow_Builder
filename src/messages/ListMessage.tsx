import { ListIcon } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { rowAnchor } from '../engine/flowAnchors'
import { MessageShell } from '../components/phone/MessageShell'
import { FormattedText } from '../components/common/FormattedText'
import { channelThemes } from '../channels/theme'
import { useSimulatorStore } from '../store/simulatorStore'
import { useChartMessageIndex } from './chartAnchorContext'

interface ListMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

export function ListMessage({ message, channel, interactive, timestampLabel }: ListMessageProps) {
  const openListSheet = useSimulatorStore((s) => s.openListSheet)
  const messageIndex = useChartMessageIndex()
  const theme = channelThemes[channel]
  if (message.message.type !== 'list') return null
  const { sender, header, title, description, footer, buttonLabel } = message.message
  // list is WhatsApp-only to begin with (RCS has no list type at all), but
  // header/footer are still gated the same way as RichCard for consistency
  // and in case this component is ever reused for a fallback render.
  const showWhatsAppFields = channel === 'whatsapp'

  if (messageIndex !== null) {
    // Flow chart: every row is drawn in the bubble, so each one can have an arrow.
    // The phone opens the rows in a sheet instead.
    const sections = message.message.sections
    const rows = sections.flatMap((section) => section.rows)
    return (
      <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
        <div className="p-3.5">
          {showWhatsAppFields && header && <p className="text-[11.5px] font-semibold text-slate-500 m-0 mb-1">{header}</p>}
          <h4 className="text-[14px] font-semibold text-slate-900 m-0">{title}</h4>
          {description && (
            <p className="text-[12.5px] text-slate-500 mt-0.5 mb-0">
              <FormattedText text={description} />
            </p>
          )}
        </div>
        <div className="flex flex-col border-t border-slate-100">
          {sections.map((section, sectionIndex) => {
            const offset = sections.slice(0, sectionIndex).reduce((total, item) => total + item.rows.length, 0)
            return (
              <div key={sectionIndex} className="flex flex-col">
                {section.title && (
                  <p className="m-0 px-3.5 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                    {section.title}
                  </p>
                )}
                {section.rows.map((row, rowIndex) => (
                  <button
                    key={row.id}
                    type="button"
                    data-chart-anchor={rowAnchor(messageIndex, offset + rowIndex)}
                    className={`flex w-full flex-col px-3.5 py-2 text-left border-t border-slate-100 first:border-t-0 ${theme.chipText}`}
                  >
                    <span className="truncate text-[13.5px] font-medium">{row.title}</span>
                    {row.description && <span className="truncate text-[12px] text-slate-500">{row.description}</span>}
                  </button>
                ))}
              </div>
            )
          })}
          {rows.length === 0 && <p className="m-0 px-3.5 py-2 text-[12px] text-slate-400">No rows</p>}
        </div>
      </MessageShell>
    )
  }

  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <div className="p-3.5 flex items-start gap-3">
        <span className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
          <ListIcon size={18} />
        </span>
        <div className="min-w-0">
          {showWhatsAppFields && header && (
            <p className="text-[11.5px] font-semibold text-slate-500 m-0 mb-1">{header}</p>
          )}
          <h4 className="text-[14px] font-semibold text-slate-900 m-0">{title}</h4>
          {description && (
            <p className="text-[12.5px] text-slate-500 mt-0.5 mb-0">
              <FormattedText text={description} />
            </p>
          )}
          {showWhatsAppFields && footer && (
            <p className="text-[11.5px] text-slate-400 mt-1 mb-0">
              <FormattedText text={footer} />
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        disabled={!interactive}
        onClick={() => interactive && openListSheet(message)}
        className={`w-full py-2.5 text-[13.5px] font-medium border-t border-slate-100 transition-colors ${theme.chipText} ${interactive ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
      >
        {buttonLabel}
      </button>
    </MessageShell>
  )
}
