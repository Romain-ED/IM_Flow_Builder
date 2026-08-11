import { RotateCcw, Minimize2, Expand } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {
      /* fullscreen not permitted in this context — ignore, it's optional */
    })
  } else {
    document.exitFullscreen?.().catch(() => {
      /* ignore */
    })
  }
}

export function PresenterFloatingControls() {
  const restart = useSimulatorStore((s) => s.restart)
  const togglePresenterMode = useSimulatorStore((s) => s.togglePresenterMode)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg px-2 py-2">
      <button
        type="button"
        onClick={restart}
        className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
      >
        <RotateCcw size={13} /> Restart
      </button>
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label="Toggle fullscreen"
        className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"
      >
        <Expand size={14} />
      </button>
      <button
        type="button"
        onClick={togglePresenterMode}
        aria-label="Exit presenter mode"
        className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"
      >
        <Minimize2 size={14} />
      </button>
    </div>
  )
}
