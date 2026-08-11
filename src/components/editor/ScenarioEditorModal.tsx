import { useEffect, useRef, useState } from 'react'
import { X, Upload, Copy, Download, RefreshCcw, Check } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { detectFormat, parseFlowSource, toJsonString, toYamlString } from '../../utils/flowSource'

export function ScenarioEditorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const flow = useSimulatorStore((s) => s.flow)
  const flowSource = useSimulatorStore((s) => s.flowSource)
  const validation = useSimulatorStore((s) => s.validation)
  const loadScenarioSource = useSimulatorStore((s) => s.loadScenarioSource)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(flowSource)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) setDraft(flowSource)
  }, [open, flowSource])

  if (!open) return null

  const format = detectFormat(draft)

  function apply() {
    loadScenarioSource(draft)
  }

  function loadExampleTemplate() {
    setDraft(EXAMPLE_TEMPLATE)
  }

  async function copyFlow() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  function download(kind: 'json' | 'yaml') {
    const parsed = parseFlowSource(draft)
    const data = parsed.success ? parsed.data : draft
    const content = kind === 'json' ? toJsonString(data) : typeof data === 'string' ? data : toYamlString(data)
    const blob = new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flow?.metadata.id ?? 'flow'}.${kind === 'json' ? 'json' : 'yaml'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleFile(file: File) {
    void file.text().then((text) => setDraft(text))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Close editor" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl h-full max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 m-0">Scenario editor</h2>
            <p className="text-[12px] text-slate-500 m-0">
              Paste or import a JSON/YAML flow definition · detected format: <strong>{format.toUpperCase()}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              className="flex-1 min-h-0 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12.5px] font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              aria-label="Flow definition source"
            />
            <div className="flex flex-wrap gap-1.5">
              <ToolbarButton icon={Check} label="Apply flow" onClick={apply} primary />
              <ToolbarButton icon={Upload} label="Import file" onClick={() => fileInputRef.current?.click()} />
              <ToolbarButton icon={copied ? Check : Copy} label={copied ? 'Copied' : 'Copy'} onClick={copyFlow} />
              <ToolbarButton icon={Download} label="Download JSON" onClick={() => download('json')} />
              <ToolbarButton icon={Download} label="Download YAML" onClick={() => download('yaml')} />
              <ToolbarButton icon={RefreshCcw} label="Reset" onClick={() => setDraft(flowSource)} />
              <button
                type="button"
                onClick={loadExampleTemplate}
                className="text-[11.5px] text-slate-400 hover:text-slate-600 underline underline-offset-2 ml-auto cursor-pointer"
              >
                Insert documented example
              </button>
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

          <div className="w-full sm:w-72 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 p-4 overflow-y-auto thin-scrollbar">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Validation</h3>
            {!validation ? (
              <p className="text-[12.5px] text-slate-400">No flow loaded yet.</p>
            ) : validation.success ? (
              <div className="flex flex-col gap-2">
                <p className="text-[12.5px] text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-2 m-0">
                  Flow is valid — {validation.flow.nodes.length} nodes.
                </p>
                {validation.warnings.map((warning, i) => (
                  <p key={i} className="text-[12px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2 m-0">
                    {warning.message}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {validation.errors.map((error, i) => (
                  <p key={i} className="text-[12px] text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 m-0">
                    {error.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof Upload
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
        primary ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon size={12.5} />
      {label}
    </button>
  )
}

const EXAMPLE_TEMPLATE = `# Minimal documented example — see README for the full schema reference.
version: "1.0"
metadata:
  id: minimal-example
  name: "Minimal example"
  channel: generic
brand:
  name: "Example Business"
  verified: true
variables:
  customerName: Alex
start: welcome
nodes:
  - id: welcome
    messages:
      - type: text
        text: "Hi {{customerName}}, how can we help?"
    actions:
      - label: "Say hello"
        next: hello
  - id: hello
    messages:
      - type: text
        text: "Hello there!"
    end: true
`
