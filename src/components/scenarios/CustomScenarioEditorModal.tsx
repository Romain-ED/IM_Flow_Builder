import { useEffect, useRef, useState } from 'react'
import { X, Upload, Check, RefreshCcw } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { detectFormat, validateFlowSourceForPreview } from '../../utils/flowSource'
import { EXAMPLE_FLOW_TEMPLATE } from '../../utils/exampleFlowTemplate'
import { ToolbarButton } from '../editor/ToolbarButton'

interface CustomScenarioEditorModalProps {
  open: boolean
  onClose: () => void
  /** When set, edits this existing custom scenario; otherwise creates a new one. */
  scenarioId?: string
  /** Pre-fills the editor when creating (e.g. "Duplicate" from a built-in scenario). */
  seedSource?: string
  seedName?: string
}

export function CustomScenarioEditorModal({
  open,
  onClose,
  scenarioId,
  seedSource,
  seedName,
}: CustomScenarioEditorModalProps) {
  const customScenarios = useSimulatorStore((s) => s.customScenarios)
  const importCustomScenario = useSimulatorStore((s) => s.importCustomScenario)
  const saveCustomScenario = useSimulatorStore((s) => s.saveCustomScenario)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existing = scenarioId ? customScenarios.find((sc) => sc.id === scenarioId) : undefined
  const [name, setName] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (existing) {
      setName(existing.name)
      setDraft(existing.source)
    } else {
      setName(seedName ?? '')
      setDraft(seedSource ?? EXAMPLE_FLOW_TEMPLATE)
    }
    // Re-initializes only when the modal opens or switches target scenario —
    // `existing`/`seedSource`/`seedName` are read fresh at that moment.
  }, [open, scenarioId])

  if (!open) return null

  const format = detectFormat(draft)
  const preview = validateFlowSourceForPreview(draft)

  function handleSave() {
    if (existing) {
      const result = saveCustomScenario(existing.id, { name: name.trim() || existing.name, source: draft })
      if (!result.success) {
        setError(result.error ?? 'Could not save this scenario.')
        return
      }
    } else {
      const result = importCustomScenario(draft, undefined, name.trim() || undefined)
      if (!result.success) {
        setError(result.error ?? 'Could not save this scenario.')
        return
      }
    }
    onClose()
  }

  function handleFile(file: File) {
    void file.text().then((text) => setDraft(text))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Close editor" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 m-0">
              {existing ? 'Edit scenario' : 'New scenario'}
            </h2>
            <p className="text-[12px] text-slate-500 m-0">
              Saved locally in this browser · detected format: <strong>{format.toUpperCase()}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium support escalation"
              className="rounded-md border border-violet-200 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </label>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-0 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12.5px] font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            aria-label="Flow definition source"
          />

          {error && <p className="text-[12px] text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 m-0">{error}</p>}
          {!error && preview && (
            <p
              className={`text-[12px] rounded-lg px-2.5 py-2 m-0 ${
                preview.success ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
              }`}
            >
              {preview.success ? `Looks valid — ${preview.nodeCount} nodes.` : preview.message}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <ToolbarButton icon={Check} label={existing ? 'Save changes' : 'Save scenario'} onClick={handleSave} variant="emerald" />
            <ToolbarButton icon={Upload} label="Import file" onClick={() => fileInputRef.current?.click()} variant="indigo" />
            {existing && (
              <ToolbarButton icon={RefreshCcw} label="Reset" onClick={() => setDraft(existing.source)} variant="rose" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}
