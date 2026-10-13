import { RotateCcw, Smartphone } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { PhonePlatform } from '../../schema/platform'

const PLATFORM_OPTIONS: { id: PhonePlatform; label: string }[] = [
  { id: 'ios', label: 'iOS' },
  { id: 'android', label: 'Android' },
]

/**
 * The only control surface a shared-link viewer gets — switching the phone
 * between iOS and Android, and restarting the flow. Deliberately minimal (no
 * fullscreen/exit buttons like `PresenterFloatingControls` has): there's
 * nothing to "exit" back to, since `sharedLinkMode` isn't a togglable view,
 * it's the only thing this page load is allowed to show.
 */
export function SharedLinkFloatingControls() {
  const restart = useSimulatorStore((s) => s.restart)
  const phonePlatform = useSimulatorStore((s) => s.phonePlatform)
  const setPhonePlatform = useSimulatorStore((s) => s.setPhonePlatform)
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg px-2 py-2">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Phone platform">
        {PLATFORM_OPTIONS.map((option) => {
          const isActive = phonePlatform === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setPhonePlatform(option.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${
                isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Smartphone size={13} /> {option.label}
            </button>
          )
        })}
      </div>
      <span aria-hidden="true" className="h-5 w-px bg-slate-200" />
      <button
        type="button"
        onClick={restart}
        className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium bg-slate-900 text-white hover:bg-slate-800 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      >
        <RotateCcw size={13} /> Restart
      </button>
    </div>
  )
}
