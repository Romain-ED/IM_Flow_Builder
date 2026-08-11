import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import { parseFlowSource, toJsonString, toYamlString } from '../../utils/flowSource'
import { buildShareUrl, copyToClipboard } from '../../utils/shareLink'
import { ScenarioCard } from './ScenarioCard'
import { CustomScenarioEditorModal } from './CustomScenarioEditorModal'

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function shareScenario(source: string): Promise<boolean> {
  const url = await buildShareUrl(source)
  return copyToClipboard(url)
}

function exportScenario(name: string, source: string, kind: 'json' | 'yaml') {
  const parsed = parseFlowSource(source)
  const data = parsed.success ? parsed.data : source
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'scenario'
  if (kind === 'json') {
    downloadText(`${slug}.json`, toJsonString(data), 'application/json')
  } else {
    const content = typeof data === 'string' ? data : toYamlString(data)
    downloadText(`${slug}.yaml`, content, 'text/yaml')
  }
}

export function ScenariosPage({ onNavigateToSimulator }: { onNavigateToSimulator: () => void }) {
  const customScenarios = useSimulatorStore((s) => s.customScenarios)
  const loadBuiltInScenario = useSimulatorStore((s) => s.loadBuiltInScenario)
  const loadCustomScenario = useSimulatorStore((s) => s.loadCustomScenario)
  const duplicateAsCustomScenario = useSimulatorStore((s) => s.duplicateAsCustomScenario)
  const deleteCustomScenario = useSimulatorStore((s) => s.deleteCustomScenario)

  const [editorState, setEditorState] = useState<
    { open: false } | { open: true; scenarioId?: string; seedSource?: string; seedName?: string }
  >({ open: false })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function loadAndReturn(load: () => void) {
    load()
    onNavigateToSimulator()
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[19px] font-semibold text-slate-900 m-0">Manage scenarios</h1>
            <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-xl">
              Load, duplicate, edit, import, and export flow definitions. Custom scenarios are saved locally in this
              browser only.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditorState({ open: true })}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium bg-violet-600 text-white hover:bg-violet-700 cursor-pointer shrink-0"
          >
            <Plus size={15} /> New / import scenario
          </button>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 m-0">Built-in examples</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {BUILT_IN_SCENARIOS.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                name={scenario.name}
                description={scenario.description}
                badge="Built-in"
                onLoad={() => loadAndReturn(() => loadBuiltInScenario(scenario.id))}
                onDuplicate={() =>
                  setEditorState({ open: true, seedSource: scenario.source, seedName: `Copy of ${scenario.name}` })
                }
                onExportJson={() => exportScenario(scenario.name, scenario.source, 'json')}
                onExportYaml={() => exportScenario(scenario.name, scenario.source, 'yaml')}
                onShareLink={() => shareScenario(scenario.source)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 m-0">My scenarios</h2>
          {customScenarios.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-[13px] text-slate-500 m-0">
                No custom scenarios yet. Duplicate a built-in example above, or create/import a new one.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {customScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  name={scenario.name}
                  description={scenario.description}
                  badge="Custom"
                  meta={`Updated ${new Date(scenario.updatedAt).toLocaleString()}`}
                  onLoad={() => loadAndReturn(() => loadCustomScenario(scenario.id))}
                  onEdit={() => setEditorState({ open: true, scenarioId: scenario.id })}
                  onDuplicate={() => duplicateAsCustomScenario(scenario.source, scenario.format, scenario.name)}
                  onExportJson={() => exportScenario(scenario.name, scenario.source, 'json')}
                  onExportYaml={() => exportScenario(scenario.name, scenario.source, 'yaml')}
                  onShareLink={() => shareScenario(scenario.source)}
                  onDelete={() => setConfirmDeleteId(scenario.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {editorState.open && (
        <CustomScenarioEditorModal
          open
          onClose={() => setEditorState({ open: false })}
          scenarioId={editorState.scenarioId}
          seedSource={editorState.seedSource}
          seedName={editorState.seedName}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Cancel delete"
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
            <h3 className="text-[14.5px] font-semibold text-slate-900 m-0">Delete this scenario?</h3>
            <p className="text-[12.5px] text-slate-500 mt-1.5 mb-4">
              This only removes it from your browser's local storage — it cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCustomScenario(confirmDeleteId)
                  setConfirmDeleteId(null)
                }}
                className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
