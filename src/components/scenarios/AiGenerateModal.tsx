import { useState } from 'react'
import { X, Sparkles, Loader2, ClipboardCopy, KeyRound } from 'lucide-react'
import { generateScenarioWithAI, DEFAULT_AI_MODEL } from '../../utils/aiScenarioGenerator'
import { buildExternalPrompt } from '../../utils/scenarioAuthoringGuide'
import { loadAiApiKey, saveAiApiKey, clearAiApiKey } from '../../store/persistence'
import { copyToClipboard } from '../../utils/shareLink'
import { useSimulatorStore } from '../../store/simulatorStore'

interface AiGenerateModalProps {
  onClose: () => void
  /** Called with the generated YAML — the caller sets its editor draft to this. */
  onGenerated: (source: string) => void
}

export function AiGenerateModal({ onClose, onGenerated }: AiGenerateModalProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  const [description, setDescription] = useState('')
  const [apiKey, setApiKey] = useState(() => loadAiApiKey() ?? '')
  const [model, setModel] = useState(DEFAULT_AI_MODEL)
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setError(null)
    if (!description.trim()) {
      setError('Describe the scenario you want first.')
      return
    }
    if (!apiKey.trim()) {
      setError('Enter an Anthropic API key first.')
      return
    }
    saveAiApiKey(apiKey.trim())
    setStatus('loading')
    const result = await generateScenarioWithAI(apiKey.trim(), description, { model })
    setStatus('idle')
    if (!result.success) {
      setError(result.error)
      return
    }
    onGenerated(result.source)
    onClose()
  }

  async function handleCopyPrompt() {
    if (!description.trim()) {
      setError('Describe the scenario you want first.')
      return
    }
    const copied = await copyToClipboard(buildExternalPrompt(description))
    if (copied) {
      showToast('Prompt copied — paste it into Claude, ChatGPT, or any AI tool, then paste the result back into the editor')
      onClose()
    } else {
      setError('Could not copy to clipboard.')
    }
  }

  function handleClearKey() {
    clearAiApiKey()
    setApiKey('')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-600" />
            <h2 className="text-[15px] font-semibold text-slate-900 m-0">Generate with AI</h2>
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

        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Describe the conversation you want
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A pizza delivery order that confirms the order, lets the customer track it, and offers help if something's wrong"
              rows={3}
              className="w-full rounded-lg border border-violet-200 p-2.5 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Anthropic API key
            </span>
            <div className="flex items-center gap-1.5">
              <KeyRound size={14} className="text-slate-400 shrink-0" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 m-0">
              Stored only in this browser and sent directly to Anthropic when you click Generate — never through any
              server of ours. Get a key at{' '}
              <span className="text-slate-500">console.anthropic.com</span>.
            </p>
          </label>

          <details className="text-[11.5px] text-slate-500">
            <summary className="cursor-pointer select-none">Model</summary>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-slate-200 px-2 py-1 text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <p className="mt-1 mb-0">Change this if your account doesn't have access to the default model.</p>
          </details>

          {error && <p className="text-[12px] text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 m-0">{error}</p>}

          <div className="flex flex-wrap gap-1.5 mt-1">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={status === 'loading'}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {status === 'loading' ? 'Generating…' : 'Generate'}
            </button>
            <button
              type="button"
              onClick={handleCopyPrompt}
              disabled={status === 'loading'}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium bg-white text-violet-700 border border-violet-200 hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ClipboardCopy size={13} /> Copy prompt instead
            </button>
          </div>
          <p className="text-[11px] text-slate-400 m-0">
            No key handy? Copy the prompt and paste it into any AI tool you already use, then paste the YAML result
            back into the editor.
          </p>
        </div>
      </div>
    </div>
  )
}
