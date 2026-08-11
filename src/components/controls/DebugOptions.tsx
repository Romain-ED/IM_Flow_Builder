import { useSimulatorStore } from '../../store/simulatorStore'

export function DebugOptions() {
  const fastMode = useSimulatorStore((s) => s.fastMode)
  const toggleFastMode = useSimulatorStore((s) => s.toggleFastMode)
  const debugWarningsEnabled = useSimulatorStore((s) => s.debugWarningsEnabled)
  const toggleDebugWarnings = useSimulatorStore((s) => s.toggleDebugWarnings)
  const debugPanelOpen = useSimulatorStore((s) => s.debugPanelOpen)
  const toggleDebugPanel = useSimulatorStore((s) => s.toggleDebugPanel)
  const flow = useSimulatorStore((s) => s.flow)
  const startNodeOverride = useSimulatorStore((s) => s.startNodeOverride)
  const setStartNodeOverride = useSimulatorStore((s) => s.setStartNodeOverride)

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Debug options</span>
      <ToggleRow label="Fast demo mode" checked={fastMode} onChange={toggleFastMode} />
      <ToggleRow label="Show capability warnings" checked={debugWarningsEnabled} onChange={toggleDebugWarnings} />
      <ToggleRow label="Flow inspector panel" checked={debugPanelOpen} onChange={toggleDebugPanel} />
      {flow && (
        <label className="flex flex-col gap-0.5">
          <span className="text-[11.5px] text-slate-500">Start node (on Restart)</span>
          <select
            value={startNodeOverride ?? flow.start}
            onChange={(e) => setStartNodeOverride(e.target.value === flow.start ? null : e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1.5 text-[12.5px] bg-white"
          >
            {flow.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.id === flow.start ? `${node.id} (start)` : node.label ? `${node.id} — ${node.label}` : node.id}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-[12.5px] text-slate-700">{label}</span>
      <span className="relative inline-flex h-5 w-9 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-slate-900 transition-colors" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
