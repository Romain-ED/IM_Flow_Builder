import { Globe } from 'lucide-react'
import type { Action } from '../../schema/messages'
import type { ChannelId } from '../../schema/flow'
import { channelThemes } from '../../channels/theme'
import { useSimulatorStore } from '../../store/simulatorStore'
import { getActionIcon } from '../../utils/actionIcons'

interface ActionButtonProps {
  action: Action
  channel: ChannelId
  interactive: boolean
  variant?: 'chip' | 'block'
}

export function ActionButton({ action, channel, interactive, variant = 'chip' }: ActionButtonProps) {
  const handleAction = useSimulatorStore((s) => s.handleAction)
  const theme = channelThemes[channel]
  const isRcs = channel === 'rcs'
  // Google Messages shows a globe for open-URL, no icon for plain replies, and
  // the usual phone / pin / calendar glyphs for the other native actions.
  const Icon = isRcs && action.type === 'open_url' ? Globe : getActionIcon(action.type)
  const showIcon = !isRcs || action.type !== 'reply'

  const baseClasses =
    variant === 'chip'
      ? isRcs
        ? `inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] transition-colors ${theme.chipBg} ${theme.chipBorder} ${theme.chipText}`
        : `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${theme.chipBg} ${theme.chipBorder} ${theme.chipText}`
      : isRcs
        ? `flex min-h-[52px] w-full items-center justify-start gap-3 bg-white px-3 py-2.5 text-left text-[14px] transition-colors ${theme.chipText} hover:bg-slate-50`
        : `flex w-full items-center justify-center gap-1.5 py-2.5 text-[13.5px] font-medium transition-colors ${theme.chipText} ${theme.chipBorder} hover:bg-slate-50`

  return (
    <button
      type="button"
      className={`${baseClasses} ${!interactive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
      style={variant === 'chip' ? undefined : {}}
      disabled={!interactive}
      onClick={() => interactive && handleAction(action)}
    >
      {variant === 'block' && isRcs ? (
        showIcon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f4f9] text-slate-700">
            <Icon size={18} />
          </span>
        )
      ) : (
        showIcon && <Icon size={variant === 'chip' && isRcs ? 16 : 14} className={variant === 'chip' && isRcs ? 'text-[#0b57d0]' : undefined} />
      )}
      <span className="truncate">{action.label}</span>
    </button>
  )
}
