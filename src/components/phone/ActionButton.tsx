import { ExternalLink, Phone, MapPin, Calendar, Sparkles, ArrowRight } from 'lucide-react'
import type { Action } from '../../schema/messages'
import type { ChannelId } from '../../schema/flow'
import { channelThemes } from '../../channels/theme'
import { useSimulatorStore } from '../../store/simulatorStore'

const ICONS: Record<Action['type'], typeof Phone> = {
  reply: ArrowRight,
  open_url: ExternalLink,
  call: Phone,
  location: MapPin,
  calendar: Calendar,
  custom: Sparkles,
}

interface ActionButtonProps {
  action: Action
  channel: ChannelId
  interactive: boolean
  variant?: 'chip' | 'block'
}

export function ActionButton({ action, channel, interactive, variant = 'chip' }: ActionButtonProps) {
  const handleAction = useSimulatorStore((s) => s.handleAction)
  const theme = channelThemes[channel]
  const Icon = ICONS[action.type]

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
