import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { ImageWithFallback } from '../components/common/ImageWithFallback'
import { FormattedText } from '../components/common/FormattedText'
import { ActionButton } from '../components/phone/ActionButton'
import { RCS_ACTION_STACK } from '../channels/rcs/cardStyles'

interface RichCardProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

// Google's RCS media heights for vertical cards are 112 / 168 / 264 DP.
const RCS_MEDIA_HEIGHTS: Record<string, string> = { short: 'h-[112px]', medium: 'h-[168px]', tall: 'h-[264px]' }
const WHATSAPP_MEDIA_HEIGHTS: Record<string, string> = { short: 'h-28', medium: 'h-44', tall: 'h-64' }

export function RichCard({ message, channel, interactive, timestampLabel }: RichCardProps) {
  if (message.message.type !== 'rich_card') return null
  const { sender, header, image, title, description, footer, mediaHeight, orientation, actions } = message.message
  const isRcs = channel === 'rcs'
  const hasActions = Boolean(actions && actions.length > 0)

  if (isRcs) {
    const horizontal = orientation === 'horizontal' && Boolean(image)
    const body = (
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="px-4 pb-2 pt-4">
          <h4 className="m-0 text-[15px] font-semibold leading-snug text-slate-900">{title}</h4>
          {description && (
            <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-slate-600">
              <FormattedText text={description} />
            </p>
          )}
        </div>
        {hasActions && (
          <div className={`${RCS_ACTION_STACK} px-3 pb-3 pt-1`}>
            {actions!.map((action, i) => (
              <ActionButton key={i} action={action} channel={channel} interactive={interactive} variant="block" />
            ))}
          </div>
        )}
      </div>
    )
    return (
      <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel} tinted>
        {horizontal ? (
          <div className="flex items-stretch">
            <div className="relative w-[128px] shrink-0">
              <ImageWithFallback src={image} alt={title} className="absolute inset-0 block h-full w-full object-cover" />
            </div>
            {body}
          </div>
        ) : (
          <>
            {image && (
              <ImageWithFallback
                src={image}
                alt={title}
                className={`w-full ${RCS_MEDIA_HEIGHTS[mediaHeight ?? 'medium']} object-cover block`}
              />
            )}
            {body}
          </>
        )}
      </MessageShell>
    )
  }

  const heightClass = WHATSAPP_MEDIA_HEIGHTS[mediaHeight ?? 'medium']
  // header/footer are a real WhatsApp interactive-message concept (Meta's
  // Cloud API) with no equivalent on RCS's rich card (title + description +
  // media + suggestions only, per Google's spec) — only render them on the
  // WhatsApp channel so RCS never shows content it has no real field for.
  return (
    <MessageShell sender={sender ?? 'business'} channel={channel} chrome="card" timestampLabel={timestampLabel}>
      {image && <ImageWithFallback src={image} alt={title} className={`w-full ${heightClass} object-cover block`} />}
      <div className="p-3.5">
        {header && <p className="text-[12.5px] font-semibold text-slate-500 m-0 mb-1">{header}</p>}
        <h4 className="text-[14.5px] font-semibold text-slate-900 m-0">{title}</h4>
        {description && (
          <p className="text-[13px] text-slate-600 mt-1 mb-0">
            <FormattedText text={description} />
          </p>
        )}
        {footer && (
          <p className="text-[12px] text-slate-400 mt-2 mb-0">
            <FormattedText text={footer} />
          </p>
        )}
      </div>
      {hasActions && (
        <div className="flex flex-col">
          {actions!.map((action, i) => (
            <ActionButton key={i} action={action} channel={channel} interactive={interactive} variant="block" />
          ))}
        </div>
      )}
    </MessageShell>
  )
}
