import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

export function Toast() {
  const toast = useSimulatorStore((s) => s.toast)
  const dismissToast = useSimulatorStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismissToast, 2600)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <div className="absolute left-1/2 bottom-20 -translate-x-1/2 z-50 animate-toast-in" role="status">
      <div className="flex items-center gap-2 bg-slate-900 text-white text-[12.5px] font-medium rounded-full px-4 py-2.5 shadow-lg max-w-[85%]">
        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
        <span>{toast.message}</span>
      </div>
    </div>
  )
}
