import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useSimulatorStore } from './store/simulatorStore'
import { BUILT_IN_SCENARIOS } from './scenarios'
import type { AppPage } from './app/pages'
import { AppHeader } from './components/layout/AppHeader'
import { Sidebar } from './components/layout/Sidebar'
import { ResizableSidePanel } from './components/layout/ResizableSidePanel'
import { PresenterFloatingControls } from './components/layout/PresenterFloatingControls'
import { SharedLinkFloatingControls } from './components/layout/SharedLinkFloatingControls'
import { PhoneFrame } from './components/phone/PhoneFrame'
import { PhoneScreen } from './components/phone/PhoneScreen'
import { DebugDrawer } from './components/debug/DebugDrawer'
import { RcsMessagesPanel } from './components/debug/RcsMessagesPanel'
import { ScenarioEditorModal } from './components/editor/ScenarioEditorModal'
import { ScenariosPage } from './components/scenarios/ScenariosPage'
import { FlowChartPage } from './components/flowchart/FlowChartPage'
import { buildChartScenarioOptions } from './components/flowchart/chartScenario'
import { ManualPage } from './components/manual/ManualPage'
import { LiveDiagnosticsPage } from './components/live/LiveDiagnosticsPage'
import { ConversationsPage } from './components/live/ConversationsPage'
import { darkFocusRing, darkSurface } from './utils/darkChrome'

const PANEL_DEFAULT_WIDTH = 320
const PANEL_MIN_WIDTH = 240
const PANEL_MAX_WIDTH = 720
/** Room the phone keeps when a right-hand panel is widened. */
const PHONE_MIN_WIDTH = 420

function App() {
  const initialize = useSimulatorStore((s) => s.initialize)
  const presenterMode = useSimulatorStore((s) => s.presenterMode)
  const sharedLinkMode = useSimulatorStore((s) => s.sharedLinkMode)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)
  const rcsMessagesPanelOpen = useSimulatorStore((s) => s.rcsMessagesPanelOpen)
  const phonePlatform = useSimulatorStore((s) => s.phonePlatform)
  const sharedLinkError = useSimulatorStore((s) => s.sharedLinkError)
  const flowLoaded = useSimulatorStore((s) => s.flow !== null)
  const customScenarios = useSimulatorStore((s) => s.customScenarios)
  const chartOptions = useMemo(
    () => buildChartScenarioOptions(BUILT_IN_SCENARIOS, customScenarios),
    [customScenarios],
  )

  const [page, setPage] = useState<AppPage>('simulator')
  const [chartKey, setChartKey] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileDebugOpen, setMobileDebugOpen] = useState(false)
  const [flowPanelWidth, setFlowPanelWidth] = useState(PANEL_DEFAULT_WIDTH)
  const [rcsPanelWidth, setRcsPanelWidth] = useState(PANEL_DEFAULT_WIDTH)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Largest width for one right-hand panel: the stage minus the sidebar, the other open
  // panel, and the phone's minimum width. Read at drag start, so it follows the window size.
  const maxPanelWidth = (otherPanelWidth: number) => () => {
    const stage = stageRef.current
    if (!stage) return PANEL_MAX_WIDTH
    const room = stage.clientWidth - (sidebarRef.current?.offsetWidth ?? 0) - otherPanelWidth - PHONE_MIN_WIDTH
    return Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, room))
  }

  useEffect(() => {
    initialize()
  }, [initialize])

  // A shared-link recipient never gets the rest of the tool — no
  // Scenarios/Manual pages, no scenario switcher, no brand/variable/
  // channel/debug controls, not even Presenter Mode's toggle-back button
  // (checked first, so it wins over presenterMode if both were somehow
  // true — restriction is mandatory here, not a togglable view).
  if (sharedLinkMode) {
    if (sharedLinkError || !flowLoaded) {
      return (
        <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-6">
          {sharedLinkError ? (
            <div role="alert" className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
              <h1 className="m-0 text-[16px] font-semibold text-slate-900">This shared link can't be opened</h1>
              <p className="mt-2 mb-0 text-[13px] text-slate-600">{sharedLinkError}</p>
            </div>
          ) : (
            <p role="status" className="text-[13px] text-slate-500">Loading shared simulation…</p>
          )}
        </div>
      )
    }
    return (
      <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-6 pb-24">
        <div className="phone-viewport h-full w-full">
          <PhoneFrame platform={phonePlatform}>
            <PhoneScreen />
          </PhoneFrame>
        </div>
        <SharedLinkFloatingControls />
      </div>
    )
  }

  if (presenterMode) {
    return (
      <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-6 pb-24">
        <div className="phone-viewport h-full w-full">
          <PhoneFrame platform={phonePlatform}>
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

      {page === 'scenarios' && (
        <ScenariosPage
          onNavigateToSimulator={() => setPage('simulator')}
          onOpenFlowChart={(key) => {
            setChartKey(key)
            setPage('flowChart')
          }}
        />
      )}
      {page === 'flowChart' && (
        <FlowChartPage
          options={chartOptions}
          selectedKey={chartKey}
          onSelect={setChartKey}
          onBack={() => setPage('scenarios')}
        />
      )}
      {page === 'manual' && <ManualPage />}
      {page === 'liveDiagnostics' && <LiveDiagnosticsPage />}
      {page === 'conversations' && <ConversationsPage />}

      {page === 'simulator' && (
        <div ref={stageRef} className="flex-1 min-h-0 flex">
          <div ref={sidebarRef} className={`hidden lg:block shrink-0 border-r ${darkSurface.border} ${darkSurface.sidebar}`}>
            <Sidebar collapsible onOpenEditor={() => setEditorOpen(true)} />
          </div>

          <main className="flex-1 min-w-0 flex items-center justify-center p-6 overflow-y-auto bg-slate-50">
            <div className="phone-viewport h-full w-full">
              <PhoneFrame platform={phonePlatform}>
                <PhoneScreen />
              </PhoneFrame>
            </div>
          </main>

          {debugPanelOpen && (
            <ResizableSidePanel
              label="Resize flow inspector"
              width={flowPanelWidth}
              onWidthChange={setFlowPanelWidth}
              minWidth={PANEL_MIN_WIDTH}
              getMaxWidth={maxPanelWidth(rcsMessagesPanelOpen ? rcsPanelWidth : 0)}
            >
              <DebugDrawer />
            </ResizableSidePanel>
          )}

          {rcsMessagesPanelOpen && (
            <ResizableSidePanel
              label="Resize RCS messages panel"
              width={rcsPanelWidth}
              onWidthChange={setRcsPanelWidth}
              minWidth={PANEL_MIN_WIDTH}
              getMaxWidth={maxPanelWidth(debugPanelOpen ? flowPanelWidth : 0)}
            >
              <RcsMessagesPanel />
            </ResizableSidePanel>
          )}
        </div>
      )}

      {mobileSidebarOpen && (
        <MobileOverlay dark title="Scenario controls" onClose={() => setMobileSidebarOpen(false)}>
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
  dark = false,
  children,
}: {
  title: string
  onClose: () => void
  /** Dark panel chrome for overlays that host the dark sidebar. */
  dark?: boolean
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-[86%] max-w-[340px] h-full shadow-2xl flex flex-col ${dark ? darkSurface.sidebar : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${dark ? darkSurface.border : 'border-slate-100'}`}>
          <h2 className={`text-[14px] font-semibold m-0 ${dark ? 'text-zinc-100' : 'text-slate-900'}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`h-8 w-8 flex items-center justify-center rounded-full cursor-pointer ${
              dark ? 'text-zinc-400 hover:bg-white/[0.06] hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            } ${darkFocusRing}`}
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
