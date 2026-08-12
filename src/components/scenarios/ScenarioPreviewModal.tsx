import { useMemo, useState } from 'react'
import { X, Code2, Waypoints, FileJson, FileText, Copy, Check } from 'lucide-react'
import { parseFlowSource, detectFormat, toJsonString, toYamlString, type FlowSourceFormat } from '../../utils/flowSource'
import { validateFlowWithChannelCompliance as validateFlow } from '../../channels/validateChannelCompliance'
import { computeFlowGraphLayout } from '../../engine/flowGraph'
import { copyToClipboard } from '../../utils/shareLink'
import { FlowGraphView, FlowGraphLegend } from '../debug/FlowGraphView'

interface ScenarioPreviewModalProps {
  open: boolean
  onClose: () => void
  name: string
  source: string
}

/**
 * Read-only "quick look" at a scenario: its JSON/YAML source (converted
 * on the fly regardless of which format it was authored in) and its flow
 * graph — without loading it into the simulator or opening the full editor.
 */
export function ScenarioPreviewModal({ open, onClose, name, source }: ScenarioPreviewModalProps) {
  const [view, setView] = useState<'source' | 'graph'>('source')
  const [format, setFormat] = useState<FlowSourceFormat>(() => detectFormat(source))
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => parseFlowSource(source), [source])

  const sourceText = useMemo(() => {
    if (!parsed.success) return source
    return format === 'json' ? toJsonString(parsed.data) : toYamlString(parsed.data)
  }, [parsed, format, source])

  const graphLayout = useMemo(() => {
    if (!parsed.success) return null
    const validated = validateFlow(parsed.data)
    return validated.success ? computeFlowGraphLayout(validated.flow) : null
  }, [parsed])

  if (!open) return null

  async function handleCopy() {
    const ok = await copyToClipboard(sourceText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Close preview" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900 m-0 truncate">{name}</h2>
            <p className="text-[12px] text-slate-500 m-0">Read-only quick look — use Edit to make changes.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-md border border-slate-200 overflow-hidden w-fit">
              <button
                type="button"
                onClick={() => setView('source')}
                aria-pressed={view === 'source'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium cursor-pointer ${view === 'source' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Code2 size={12.5} /> Source
              </button>
              <button
                type="button"
                onClick={() => setView('graph')}
                aria-pressed={view === 'graph'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium cursor-pointer ${view === 'graph' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Waypoints size={12.5} /> Graph
              </button>
            </div>

            {view === 'source' && (
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-md border border-slate-200 overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => setFormat('json')}
                    aria-pressed={format === 'json'}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium cursor-pointer ${format === 'json' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <FileJson size={12.5} /> JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('yaml')}
                    aria-pressed={format === 'yaml'}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium cursor-pointer ${format === 'yaml' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <FileText size={12.5} /> YAML
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  {copied ? <Check size={12.5} className="text-emerald-600" /> : <Copy size={12.5} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {view === 'source' ? (
            <pre className="flex-1 min-h-0 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12.5px] font-mono leading-relaxed overflow-auto thin-scrollbar m-0">
              <code>{sourceText}</code>
            </pre>
          ) : graphLayout ? (
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <FlowGraphView layout={graphLayout} interactive={false} />
              <FlowGraphLegend />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex items-center justify-center text-[12.5px] text-slate-400 border border-dashed border-slate-300 rounded-lg">
              This scenario doesn't parse/validate, so the graph can't be shown.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
