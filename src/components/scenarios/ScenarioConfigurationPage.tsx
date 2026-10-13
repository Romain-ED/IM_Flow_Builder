import { ArrowLeft, Code2, Play } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { BrandEditor } from '../controls/BrandEditor'
import { VariablesEditor } from '../controls/VariablesEditor'

interface ScenarioConfigurationPageProps {
  scenarioId: string
  onBack: () => void
  onEditSource: () => void
  onNavigateToSimulator: () => void
}

export function ScenarioConfigurationPage({
  scenarioId,
  onBack,
  onEditSource,
  onNavigateToSimulator,
}: ScenarioConfigurationPageProps) {
  const scenario = useSimulatorStore((s) => s.customScenarios.find((entry) => entry.id === scenarioId))
  const flow = useSimulatorStore((s) => s.flow)

  if (!scenario) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[13px] text-slate-500 m-0">This scenario is no longer available.</p>
          <button type="button" onClick={onBack} className="mt-3 text-[12.5px] font-medium text-indigo-600 hover:underline cursor-pointer">
            Back to scenarios
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 flex items-center gap-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to scenarios
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 m-0">Scenario configuration</p>
            <h1 className="mt-1 text-[20px] font-semibold text-slate-900">{scenario.name}</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-slate-500">
              Configure the values used by this scenario. Changes are saved automatically and are used when the scenario is loaded in the simulator.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEditSource}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Code2 size={14} /> Edit flow source
            </button>
            <button
              type="button"
              onClick={onNavigateToSimulator}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[12.5px] font-medium text-white hover:bg-indigo-700 cursor-pointer"
            >
              <Play size={14} /> Open simulator
            </button>
          </div>
        </div>

        {!flow && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            Load this scenario in the simulator to preview configuration changes.
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-[14px] font-semibold text-slate-900 m-0">Business profile</h2>
            <p className="mt-1 mb-4 text-[12px] text-slate-500">Set the profile image, account logo, RCS banner, and identity shown in the conversation.</p>
            <BrandEditor />
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-[14px] font-semibold text-slate-900 m-0">Scenario variables</h2>
            <p className="mt-1 mb-4 text-[12px] text-slate-500">These initial values are restored whenever the scenario starts.</p>
            <VariablesEditor />
          </section>
        </div>
      </div>
    </div>
  )
}
