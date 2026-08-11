import { PanelLeft, PanelRight, Maximize2, Minimize2, MessageSquareText } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

interface AppHeaderProps {
  onToggleMobileSidebar: () => void
  onToggleMobileDebug: () => void
}

export function AppHeader({ onToggleMobileSidebar, onToggleMobileDebug }: AppHeaderProps) {
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const togglePresenterMode = useSimulatorStore((s) => s.togglePresenterMode)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)
  const toggleDebugPanel = useSimulatorStore((s) => s.toggleDebugPanel)

  return (
    <header className="shrink-0 h-14 flex items-center justify-between gap-3 px-4 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
          aria-label="Toggle scenario controls"
        >
          <PanelLeft size={17} />
        </button>
        <MessageSquareText size={19} className="text-slate-700 shrink-0" aria-hidden="true" />
        <h1 className="text-[14.5px] font-semibold text-slate-900 truncate m-0">
          Business Messaging Flow Simulator
        </h1>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileDebug}
          className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
          aria-label="Toggle flow inspector"
        >
          <PanelRight size={17} />
        </button>
        <button
          type="button"
          onClick={toggleDebugPanel}
          className={`hidden lg:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer ${
            debugPanelOpen ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PanelRight size={14} /> Inspector
        </button>
        <button
          type="button"
          onClick={togglePresenterMode}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer ${
            presenterMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {presenterMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          Presenter mode
        </button>
      </div>
    </header>
  )
}
