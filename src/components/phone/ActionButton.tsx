import type { Action } from '../../schema/messages'
import type { ChannelId } from '../../schema/flow'
import { channelThemes } from '../../channels/theme'
import { useSimulatorStore } from '../../store/simulatorStore'
import { ACTION_ICONS } from '../../utils/actionIcons'

interface ActionButtonProps {
  action: Action
  channel: ChannelId
  interactive: boolean
  variant?: 'chip' | 'block'
}

export function ActionButton({ action, channel, interactive, variant = 'chip' }: ActionButtonProps) {
  const handleAction = useSimulatorStore((s) => s.handleAction)
  const theme = channelThemes[channel]
  const Icon = ACTION_ICONS[action.type]

  const baseClasses =
    variant === 'chip'
      ? `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${theme.chipBg} ${theme.chipBorder} ${theme.chipText}`
      : `flex w-full items-center justify-center gap-1.5 py-2.5 text-[13.5px] font-medium transition-colors ${theme.chipText} ${theme.chipBorder} hover:bg-slate-50`

  return (
    <button
      type="button"
      className={`${baseClasses} ${!interactive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
      style={variant === 'chip' ? undefined : {}}
      disabled={!interactive}
      onClick={() => interactive && handleAction(action)}
    >
      <Icon size={14} />
      <span className="truncate">{action.label}</span>
    </button>
  )
}
