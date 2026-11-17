import { useMemo } from 'react'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { loadChartFlow, type ChartScenarioOption } from './chartScenario'
import { FlowChartView } from './FlowChartView'

interface FlowChartPageProps {
  options: ChartScenarioOption[]
  selectedKey: string | null
  onSelect: (key: string) => void
  onBack: () => void
}

export function FlowChartPage({ options, selectedKey, onSelect, onBack }: FlowChartPageProps) {
  const selected = options.find((option) => option.key === selectedKey) ?? options[0] ?? null
  const loaded = useMemo(() => (selected ? loadChartFlow(selected.source) : null), [selected])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to scenarios
        </button>
        <h1 className="text-[15px] font-semibold text-slate-900 m-0 min-w-0 truncate">
          {selected?.name ?? 'Flow chart'}
        </h1>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-slate-500">
          <span>Scenario</span>
          <select
            aria-label="Scenario"
            value={selected?.key ?? ''}
            onChange={(event) => onSelect(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12.5px] text-slate-800 cursor-pointer"
          >
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.badge === 'Custom' ? `${option.name} (custom)` : option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 p-5">
        {!loaded && <p className="text-[13px] text-slate-500 m-0">No scenario selected.</p>}
        {loaded && !loaded.ok && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <ul className="m-0 pl-4">
              {loaded.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {loaded && loaded.ok && <FlowChartView key={selected?.key} flow={loaded.flow} />}
      </div>
    </div>
  )
}
