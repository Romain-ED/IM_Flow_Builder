import { useSimulatorStore } from '../../store/simulatorStore'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkField, darkSurface } from '../../utils/darkChrome'

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
      <SectionHeading accent={sectionAccents.debug} tone="dark">Debug options</SectionHeading>
      <ToggleRow label="Fast demo mode" checked={fastMode} onChange={toggleFastMode} trackClass="peer-checked:bg-emerald-500" />
      <ToggleRow
        label="Show capability warnings"
        checked={debugWarningsEnabled}
        onChange={toggleDebugWarnings}
        trackClass="peer-checked:bg-amber-500"
      />
      <ToggleRow
        label="Flow inspector panel"
        checked={debugPanelOpen}
        onChange={toggleDebugPanel}
        trackClass="peer-checked:bg-teal-500"
      />
      {flow && (
        <label className="flex flex-col gap-0.5">
          <span className={`text-[11.5px] ${darkSurface.muted}`}>Start node (on Restart)</span>
          <select
            value={startNodeOverride ?? flow.start}
            onChange={(e) => setStartNodeOverride(e.target.value === flow.start ? null : e.target.value)}
            className={darkField}
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

function ToggleRow({
  label,
  checked,
  onChange,
  trackClass,
}: {
  label: string
  checked: boolean
  onChange: () => void
  trackClass: string
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className={`text-[12.5px] ${darkSurface.body}`}>{label}</span>
      <span className="relative inline-flex h-5 w-9 items-center">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span
          className={`absolute inset-0 rounded-full bg-slate-500 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-300 ${trackClass}`}
        />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
