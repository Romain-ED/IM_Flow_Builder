import { Check, Wallet, ExternalLink, Copy, CalendarCheck, Sparkles } from 'lucide-react'
import type { NormalizedMessage } from '../engine/types'
import type { SystemActionKind } from '../schema/messages'

interface SystemActionMessageProps {
  message: NormalizedMessage
}

const ICONS: Record<SystemActionKind, typeof Check> = {
  download: Check,
  wallet: Wallet,
  open_url: ExternalLink,
  copy: Copy,
  calendar: CalendarCheck,
  generic: Sparkles,
}

/**
 * Renders as a centered, muted system notice — deliberately not a
 * `MessageShell` bubble — so it reads as "the simulator did something"
 * rather than as a message the business or user sent.
 */
export function SystemActionMessage({ message }: SystemActionMessageProps) {
  if (message.message.type !== 'system_action') return null
  const { action, title, description } = message.message
  const Icon = ICONS[action] ?? Sparkles

  return (
    <div className="flex w-full justify-center animate-message-in" role="status">
      <div className="flex items-center gap-2 max-w-[86%] rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11.5px] text-slate-600">
        <span className="h-5 w-5 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
          <Icon size={11} />
        </span>
        <span className="min-w-0 truncate">
          <span className="font-medium text-slate-700">{title}</span>
          {description && <span className="text-slate-400"> · {description}</span>}
        </span>
      </div>
    </div>
  )
}
