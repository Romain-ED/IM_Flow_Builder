import { RotateCcw } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

function labelFor(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function VariablesEditor() {
  const configuredVariables = useSimulatorStore((s) => s.configuredVariables)
  const updateConfiguredVariable = useSimulatorStore((s) => s.updateConfiguredVariable)
  const resetConfiguredVariables = useSimulatorStore((s) => s.resetConfiguredVariables)

  const entries = Object.entries(configuredVariables)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Variables</span>
        <button
          type="button"
          onClick={resetConfiguredVariables}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>
      {entries.length === 0 && <p className="text-[12px] text-slate-400 m-0">No variables in this flow.</p>}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto thin-scrollbar pr-1">
        {entries.map(([key, value]) => (
          <label key={key} className="flex flex-col gap-0.5">
            <span className="text-[11.5px] text-slate-500">{labelFor(key)}</span>
            {typeof value === 'boolean' ? (
              <select
                value={String(value)}
                onChange={(e) => updateConfiguredVariable(key, e.target.value === 'true')}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-[12.5px] bg-white"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : typeof value === 'number' ? (
              <input
                type="number"
                value={value}
                onChange={(e) => updateConfiguredVariable(key, Number(e.target.value))}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-[12.5px]"
              />
            ) : (
              <input
                type="text"
                value={value == null ? '' : String(value)}
                onChange={(e) => updateConfiguredVariable(key, e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-[12.5px]"
              />
            )}
          </label>
        ))}
      </div>
      <p className="text-[10.5px] text-slate-400 mt-0.5 mb-0">Hit Restart to apply changes to the live conversation.</p>
    </div>
  )
}
