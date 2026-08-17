import { RotateCcw } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

/**
 * The only control surface a shared-link viewer gets — restarting the
 * flow. Deliberately minimal (no fullscreen/exit buttons like
 * `PresenterFloatingControls` has): there's nothing to "exit" back to,
 * since `sharedLinkMode` isn't a togglable view, it's the only thing this
 * page load is allowed to show.
 */
export function SharedLinkFloatingControls() {
  const restart = useSimulatorStore((s) => s.restart)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg px-2 py-2">
      <button
        type="button"
        onClick={restart}
        className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
      >
        <RotateCcw size={13} /> Restart
      </button>
    </div>
  )
}
