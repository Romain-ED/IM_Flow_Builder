import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useSimulatorStore } from './store/simulatorStore'
import { AppHeader } from './components/layout/AppHeader'
import { Sidebar } from './components/layout/Sidebar'
import { PresenterFloatingControls } from './components/layout/PresenterFloatingControls'
import { PhoneFrame } from './components/phone/PhoneFrame'
import { PhoneScreen } from './components/phone/PhoneScreen'
import { DebugDrawer } from './components/debug/DebugDrawer'
import { ScenarioEditorModal } from './components/editor/ScenarioEditorModal'

function App() {
  const initialize = useSimulatorStore((s) => s.initialize)
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)

  const [editorOpen, setEditorOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileDebugOpen, setMobileDebugOpen] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

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
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        onToggleMobileDebug={() => setMobileDebugOpen(true)}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="hidden lg:block w-[300px] shrink-0 border-r border-slate-200 bg-white">
          <Sidebar onOpenEditor={() => setEditorOpen(true)} />
        </div>

        <main className="flex-1 min-w-0 flex items-center justify-center p-6 overflow-y-auto bg-slate-50">
          <div className="h-full w-full max-w-[420px]">
            <PhoneFrame>
              <PhoneScreen />
            </PhoneFrame>
          </div>
        </main>

        {debugPanelOpen && (
          <div className="hidden lg:block w-[320px] shrink-0 border-l border-slate-200 bg-white">
            <DebugDrawer />
          </div>
        )}
      </div>

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
