import { X, ExternalLink, Phone, MapPin, Calendar, Sparkles } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { Action } from '../../schema/messages'

const CONTENT: Record<
  Action['type'],
  (action: Action) => { icon: typeof Phone; title: string; body: string }
> = {
  reply: () => ({ icon: Sparkles, title: 'Reply', body: '' }),
  open_url: (action) => ({
    icon: ExternalLink,
    title: 'Opening link (simulated)',
    body: action.type === 'open_url' ? action.url : '',
  }),
  call: (action) => ({
    icon: Phone,
    title: 'Calling (simulated)',
    body: action.type === 'call' ? action.phoneNumber : '',
  }),
  location: (action) => ({
    icon: MapPin,
    title: 'Location (simulated)',
    body: action.type === 'location' ? (action.address ?? action.query ?? 'Shared location') : '',
  }),
  calendar: (action) => ({
    icon: Calendar,
    title: 'Add to calendar (simulated)',
    body:
      action.type === 'calendar'
        ? [action.title, action.startTime, action.location].filter(Boolean).join(' · ')
        : '',
  }),
  custom: (action) => ({
    icon: Sparkles,
    title: 'Simulated action',
    body: action.type === 'custom' ? (action.message ?? action.label) : '',
  }),
}

export function ExternalActionModal() {
  const action = useSimulatorStore((s) => s.externalActionModal)
  const close = useSimulatorStore((s) => s.closeExternalActionModal)

  if (!action) return null
  const { icon: Icon, title, body } = CONTENT[action.type](action)

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-[280px] bg-white rounded-2xl shadow-2xl p-5 text-center animate-message-in">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-2 top-2 h-7 w-7 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center"
        >
          <X size={15} />
        </button>
        <div className="mx-auto h-11 w-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
          <Icon size={20} />
        </div>
        <h4 className="text-[14px] font-semibold text-slate-900 m-0">{title}</h4>
        {body && <p className="text-[12.5px] text-slate-500 mt-1.5 mb-0 break-words">{body}</p>}
        <p className="text-[11px] text-slate-400 mt-3 mb-0">No real action was performed — this is a prototype.</p>
      </div>
    </div>
  )
}
