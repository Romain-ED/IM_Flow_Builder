import { FilePenLine, Download } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import { toYamlString } from '../../utils/flowSource'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'

export function ScenarioControls({ onOpenEditor }: { onOpenEditor: () => void }) {
  const flow = useSimulatorStore((s) => s.flow)
  const loadBuiltInScenario = useSimulatorStore((s) => s.loadBuiltInScenario)
  const flowSource = useSimulatorStore((s) => s.flowSource)
  // Built-in scenario registry ids are independent of each YAML's own
  // metadata.id, so match the dropdown selection by source content instead.
  const selectedScenarioId = BUILT_IN_SCENARIOS.find((sc) => sc.source === flowSource)?.id ?? ''

  function downloadCurrent() {
    if (!flow) return
    const blob = new Blob([flowSource || toYamlString(flow)], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flow.metadata.id || 'flow'}.yaml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const accent = sectionAccents.scenario

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={accent}>Scenario</SectionHeading>
      <p className="text-[13px] font-medium text-slate-900 m-0 truncate">{flow?.metadata.name ?? 'No scenario loaded'}</p>
      <select
        value={selectedScenarioId}
        onChange={(e) => loadBuiltInScenario(e.target.value)}
        className={`rounded-md border ${accent.border} px-2 py-1.5 text-[12.5px] bg-white`}
        aria-label="Load example scenario"
      >
        <option value="" disabled>
          Load example…
        </option>
        {BUILT_IN_SCENARIOS.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
        <button
          type="button"
          onClick={onOpenEditor}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium ${accent.bg} ${accent.text} border ${accent.border} ${accent.bgHover} cursor-pointer`}
        >
          <FilePenLine size={13} /> Edit flow
        </button>
        <button
          type="button"
          onClick={downloadCurrent}
          disabled={!flow}
          className="flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
        >
          <Download size={13} /> Export
        </button>
      </div>
    </div>
  )
}
