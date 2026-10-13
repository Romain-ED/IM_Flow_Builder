import { PanelLeft, PanelRight, Maximize2, Minimize2, MessageSquareText, MonitorSmartphone, FolderCog, BookOpen, ClipboardList } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { AppPage } from '../../app/pages'
import { APP_VERSION } from '../../app/version'
import { darkFocusRing, darkSolids, darkSurface } from '../../utils/darkChrome'

interface AppHeaderProps {
  page: AppPage
  onNavigate: (page: AppPage) => void
  onToggleMobileSidebar: () => void
  onToggleMobileDebug: () => void
}

const GHOST_BUTTON = `text-slate-300 hover:bg-slate-800 hover:text-white ${darkFocusRing}`

const NAV_ITEMS: { id: AppPage; label: string; icon: typeof MonitorSmartphone }[] = [
  { id: 'simulator', label: 'Simulator', icon: MonitorSmartphone },
  { id: 'scenarios', label: 'Scenarios', icon: FolderCog },
  { id: 'manual', label: 'Manual', icon: BookOpen },
  { id: 'liveDiagnostics', label: 'Live logs', icon: ClipboardList },
]

export function AppHeader({ page, onNavigate, onToggleMobileSidebar, onToggleMobileDebug }: AppHeaderProps) {
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const togglePresenterMode = useSimulatorStore((s) => s.togglePresenterMode)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)
  const toggleDebugPanel = useSimulatorStore((s) => s.toggleDebugPanel)

  return (
    <header className={`shrink-0 h-14 flex items-center justify-between gap-3 px-4 ${darkSurface.header}`}>
      <div className="flex items-center gap-2 min-w-0">
        {page === 'simulator' && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className={`lg:hidden h-8 w-8 flex items-center justify-center rounded-md cursor-pointer ${GHOST_BUTTON}`}
            aria-label="Toggle scenario controls"
          >
            <PanelLeft size={17} />
          </button>
        )}
        <MessageSquareText size={19} className="text-indigo-400 shrink-0" aria-hidden="true" />
        <h1 className="text-[14.5px] font-semibold text-white truncate m-0 hidden sm:block">
          Business Messaging Flow Simulator
        </h1>
        <span
          className="shrink-0 text-[10px] font-semibold text-indigo-200 bg-indigo-500/20 border border-indigo-400/40 rounded-full px-1.5 py-0.5"
          title="App version"
        >
          v{APP_VERSION}
        </span>
      </div>

      <nav className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1" aria-label="Pages">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${darkFocusRing} ${
                isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="flex items-center gap-1.5 shrink-0">
        {page === 'simulator' && (
          <>
            <button
              type="button"
              onClick={onToggleMobileDebug}
              className={`lg:hidden h-8 w-8 flex items-center justify-center rounded-md cursor-pointer ${GHOST_BUTTON}`}
              aria-label="Toggle flow inspector"
            >
              <PanelRight size={17} />
            </button>
            <button
              type="button"
              onClick={toggleDebugPanel}
              aria-pressed={debugPanelOpen}
              className={`hidden lg:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                debugPanelOpen ? `${darkSolids.teal}` : GHOST_BUTTON
              }`}
            >
              <PanelRight size={14} /> Inspector
            </button>
            <button
              type="button"
              onClick={togglePresenterMode}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                presenterMode ? darkSolids.violet : GHOST_BUTTON
              }`}
            >
              {presenterMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline">Presenter mode</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
