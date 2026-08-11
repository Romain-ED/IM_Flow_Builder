import { PanelLeft, PanelRight, Maximize2, Minimize2, MessageSquareText, MonitorSmartphone, FolderCog, BookOpen } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { AppPage } from '../../app/pages'
import { APP_VERSION } from '../../app/version'

interface AppHeaderProps {
  page: AppPage
  onNavigate: (page: AppPage) => void
  onToggleMobileSidebar: () => void
  onToggleMobileDebug: () => void
}

const NAV_ITEMS: { id: AppPage; label: string; icon: typeof MonitorSmartphone }[] = [
  { id: 'simulator', label: 'Simulator', icon: MonitorSmartphone },
  { id: 'scenarios', label: 'Scenarios', icon: FolderCog },
  { id: 'manual', label: 'Manual', icon: BookOpen },
]

export function AppHeader({ page, onNavigate, onToggleMobileSidebar, onToggleMobileDebug }: AppHeaderProps) {
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const togglePresenterMode = useSimulatorStore((s) => s.togglePresenterMode)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)
  const toggleDebugPanel = useSimulatorStore((s) => s.toggleDebugPanel)

  return (
    <header className="shrink-0 h-14 flex items-center justify-between gap-3 px-4 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-2 min-w-0">
        {page === 'simulator' && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
            aria-label="Toggle scenario controls"
          >
            <PanelLeft size={17} />
          </button>
        )}
        <MessageSquareText size={19} className="text-indigo-600 shrink-0" aria-hidden="true" />
        <h1 className="text-[14.5px] font-semibold text-slate-900 truncate m-0 hidden sm:block">
          Business Messaging Flow Simulator
        </h1>
        <span
          className="shrink-0 text-[10px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-1.5 py-0.5"
          title="App version"
        >
          v{APP_VERSION}
        </span>
      </div>

      <nav className="flex items-center gap-1 bg-slate-100 rounded-lg p-1" aria-label="Pages">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
              aria-label="Toggle flow inspector"
            >
              <PanelRight size={17} />
            </button>
            <button
              type="button"
              onClick={toggleDebugPanel}
              className={`hidden lg:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                debugPanelOpen ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PanelRight size={14} /> Inspector
            </button>
            <button
              type="button"
              onClick={togglePresenterMode}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                presenterMode ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
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
