import { PanelLeft, PanelRight, Maximize2, Minimize2, MonitorSmartphone, FolderCog, BookOpen, ClipboardList, MessagesSquare } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { AppPage } from '../../app/pages'
import { APP_VERSION } from '../../app/version'
import { darkSolids, darkSurface } from '../../utils/darkChrome'
import { assetUrl } from '../../utils/assetUrl'

interface AppHeaderProps {
  page: AppPage
  onNavigate: (page: AppPage) => void
  onToggleMobileSidebar: () => void
  onToggleMobileDebug: () => void
}

// The header is dark, so it uses its own (light) focus ring instead of the shared one.
const HEADER_FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300'
const GHOST_BUTTON = `text-slate-300 hover:bg-slate-800 hover:text-white ${HEADER_FOCUS}`

type NavItem = { id: AppPage; label: string; icon: typeof MonitorSmartphone }

/** Where you work: shown as tabs in the center of the bar. */
const PRIMARY_NAV: NavItem[] = [
  { id: 'simulator', label: 'Simulator', icon: MonitorSmartphone },
  { id: 'scenarios', label: 'Scenarios', icon: FolderCog },
  { id: 'conversations', label: 'Conversations', icon: MessagesSquare },
]

/** Reference and diagnostics: quieter icon buttons on the right. */
const SECONDARY_NAV: NavItem[] = [
  { id: 'liveDiagnostics', label: 'Live logs', icon: ClipboardList },
  { id: 'manual', label: 'Manual', icon: BookOpen },
]

export function AppHeader({ page, onNavigate, onToggleMobileSidebar, onToggleMobileDebug }: AppHeaderProps) {
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const togglePresenterMode = useSimulatorStore((s) => s.togglePresenterMode)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)
  const toggleDebugPanel = useSimulatorStore((s) => s.toggleDebugPanel)

  return (
    <header className={`shrink-0 h-14 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 px-4 ${darkSurface.header}`}>
      <div className="flex items-center gap-2.5 min-w-0">
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
        <img
          src={assetUrl('/im-flow-builder-logo-small.png')}
          alt=""
          className="h-8 w-8 shrink-0 object-contain"
        />
        <h1 className="m-0 hidden min-w-0 truncate text-[14px] font-semibold text-white xl:block">
          IM Flow Builder
        </h1>
        <span
          className="shrink-0 text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-1.5 py-0.5"
          title="App version"
        >
          v{APP_VERSION}
        </span>
      </div>

      <nav className="flex items-center gap-2" aria-label="Pages">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const isActive = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-medium cursor-pointer transition-colors ${HEADER_FOCUS} ${
                isActive
                  ? 'border-indigo-300/60 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="flex items-center justify-end gap-1 min-w-0">
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
              title="Show or hide the flow inspector"
              className={`hidden lg:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                debugPanelOpen ? `${darkSolids.teal}` : GHOST_BUTTON
              }`}
            >
              <PanelRight size={14} aria-hidden="true" /> Inspector
            </button>
            <button
              type="button"
              onClick={togglePresenterMode}
              title="Full-screen phone view for presenting"
              aria-label="Presenter mode"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors ${
                presenterMode ? darkSolids.violet : GHOST_BUTTON
              }`}
            >
              {presenterMode ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
              <span className="hidden xl:inline">Present</span>
            </button>
            <span className="mx-1.5 h-5 w-px bg-slate-800" aria-hidden="true" />
          </>
        )}
        {SECONDARY_NAV.map((item) => {
          const Icon = item.icon
          const isActive = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              className={`h-8 w-8 flex items-center justify-center rounded-md cursor-pointer transition-colors ${
                isActive ? `bg-slate-800 text-white ${HEADER_FOCUS}` : GHOST_BUTTON
              }`}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </header>
  )
}
