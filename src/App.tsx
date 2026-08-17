import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useSimulatorStore } from './store/simulatorStore'
import type { AppPage } from './app/pages'
import { AppHeader } from './components/layout/AppHeader'
import { Sidebar } from './components/layout/Sidebar'
import { PresenterFloatingControls } from './components/layout/PresenterFloatingControls'
import { SharedLinkFloatingControls } from './components/layout/SharedLinkFloatingControls'
import { PhoneFrame } from './components/phone/PhoneFrame'
import { PhoneScreen } from './components/phone/PhoneScreen'
import { ComparePhones } from './components/phone/ComparePhones'
import { DebugDrawer } from './components/debug/DebugDrawer'
import { ScenarioEditorModal } from './components/editor/ScenarioEditorModal'
import { ScenariosPage } from './components/scenarios/ScenariosPage'
import { ManualPage } from './components/manual/ManualPage'

function App() {
  const initialize = useSimulatorStore((s) => s.initialize)
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const sharedLinkMode = useSimulatorStore((s) => s.sharedLinkMode)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)
  const compareMode = useSimulatorStore((s) => s.compareMode)

  const [page, setPage] = useState<AppPage>('simulator')
  const [editorOpen, setEditorOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileDebugOpen, setMobileDebugOpen] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  // A shared-link recipient never gets the rest of the tool — no
  // Scenarios/Manual pages, no scenario switcher, no brand/variable/
  // channel/debug controls, not even Presenter Mode's toggle-back button
  // (checked first, so it wins over presenterMode if both were somehow
  // true — restriction is mandatory here, not a togglable view).
  if (sharedLinkMode) {
    return (
      <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="h-full w-full max-w-[420px] max-h-[900px]">
          <PhoneFrame>
            <PhoneScreen />
          </PhoneFrame>
        </div>
        <SharedLinkFloatingControls />
      </div>
    )
  }

  if (presenterMode) {
    return (
      <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="h-full w-full max-w-[420px] max-h-[900px]">
          <PhoneFrame>
            <PhoneScreen />
          </PhoneFrame>
        </div>
        <PresenterFloatingControls />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
      <AppHeader
        page={page}
        onNavigate={setPage}
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        onToggleMobileDebug={() => setMobileDebugOpen(true)}
      />

      {page === 'scenarios' && <ScenariosPage onNavigateToSimulator={() => setPage('simulator')} />}
      {page === 'manual' && <ManualPage />}

      {page === 'simulator' && (
        <div className="flex-1 min-h-0 flex">
          <div className="hidden lg:block w-[300px] shrink-0 border-r border-slate-200 bg-white">
            <Sidebar onOpenEditor={() => setEditorOpen(true)} />
          </div>

          {compareMode ? (
            <ComparePhones />
          ) : (
            <main className="flex-1 min-w-0 flex items-center justify-center p-6 overflow-y-auto bg-slate-50">
              <div className="h-full w-full max-w-[420px]">
                <PhoneFrame>
                  <PhoneScreen />
                </PhoneFrame>
              </div>
            </main>
          )}

          {debugPanelOpen && (
            <div className="hidden lg:block w-[320px] shrink-0 border-l border-slate-200 bg-white">
              <DebugDrawer />
            </div>
          )}
        </div>
      )}

      {mobileSidebarOpen && (
        <MobileOverlay title="Scenario controls" onClose={() => setMobileSidebarOpen(false)}>
          <Sidebar
            onOpenEditor={() => {
              setEditorOpen(true)
              setMobileSidebarOpen(false)
            }}
          />
        </MobileOverlay>
      )}

      {mobileDebugOpen && (
        <MobileOverlay title="Flow inspector" onClose={() => setMobileDebugOpen(false)}>
          <DebugDrawer />
        </MobileOverlay>
      )}

      <ScenarioEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  )
}

function MobileOverlay({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[86%] max-w-[340px] h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <h2 className="text-[14px] font-semibold text-slate-900 m-0">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>
  )
}

export default App
