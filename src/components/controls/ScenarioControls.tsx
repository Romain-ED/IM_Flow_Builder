import { useState } from 'react'
import { FilePenLine, Download, Link2, Check } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import { toYamlString } from '../../utils/flowSource'
import { buildShareUrl, copyToClipboard } from '../../utils/shareLink'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkField, darkFocusRing, darkSurface, darkTints } from '../../utils/darkChrome'

export function ScenarioControls({ onOpenEditor }: { onOpenEditor: () => void }) {
  const flow = useSimulatorStore((s) => s.flow)
  const loadBuiltInScenario = useSimulatorStore((s) => s.loadBuiltInScenario)
  const flowSource = useSimulatorStore((s) => s.flowSource)
  const showToast = useSimulatorStore((s) => s.showToast)
  const phonePlatform = useSimulatorStore((s) => s.phonePlatform)
  const [linkCopied, setLinkCopied] = useState(false)
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

  async function shareLink() {
    if (!flowSource) return
    const url = await buildShareUrl(flowSource, phonePlatform)
    const ok = await copyToClipboard(url)
    if (ok) {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1800)
    } else {
      showToast('Could not copy — clipboard access unavailable')
    }
  }

  const accent = sectionAccents.scenario

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={accent} tone="dark">Scenario</SectionHeading>
      <p className={`text-[13px] font-medium m-0 truncate ${darkSurface.text}`}>{flow?.metadata.name ?? 'No scenario loaded'}</p>
      <select
        value={selectedScenarioId}
        onChange={(e) => loadBuiltInScenario(e.target.value)}
        className={darkField}
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
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium ${darkTints.indigo} ${darkFocusRing} cursor-pointer`}
        >
          <FilePenLine size={13} /> Edit flow
        </button>
        <button
          type="button"
          onClick={downloadCurrent}
          disabled={!flow}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium ${darkTints.emerald} ${darkFocusRing} disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        >
          <Download size={13} /> Export
        </button>
        <button
          type="button"
          onClick={shareLink}
          disabled={!flow}
          title="Copy a read-only link: the recipient can run the simulation, switch iOS/Android, and restart it, but cannot edit"
          className={`col-span-2 flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium ${darkTints.teal} ${darkFocusRing} disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        >
          {linkCopied ? <Check size={13} /> : <Link2 size={13} />}
          {linkCopied ? 'Link copied' : 'Copy share link'}
        </button>
      </div>
    </div>
  )
}
