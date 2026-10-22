import { Columns3, Check } from 'lucide-react'
import { useRef } from 'react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { BrandIcon } from './BrandIcon'
import { CHANNEL_OPTIONS } from '../../channels/registry'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkFocusRing, darkSolids, darkTints } from '../../utils/darkChrome'

const descriptions: Record<string, string> = { rcs: 'Google Messages rich messaging', whatsapp: 'Meta WhatsApp messaging' }

export function ChannelSelector() {
  const channel = useSimulatorStore((s) => s.channel)
  const setChannel = useSimulatorStore((s) => s.setChannel)
  const compareMode = useSimulatorStore((s) => s.compareMode)
  const toggleCompareMode = useSimulatorStore((s) => s.toggleCompareMode)
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const move = (index: number) => {
    const next = (index + CHANNEL_OPTIONS.length) % CHANNEL_OPTIONS.length
    setChannel(CHANNEL_OPTIONS[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={sectionAccents.channel} tone="dark">Channel</SectionHeading>
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Channel" aria-disabled={compareMode}>
        {CHANNEL_OPTIONS.map((opt, index) => {
          const isActive = channel === opt.id
          const brandClass = opt.id === 'rcs' ? (isActive ? 'bg-[#1a73e8]' : 'bg-[#4285f4] hover:bg-[#1a73e8]') : (isActive ? 'bg-[#128c7e]' : 'bg-[#128c7e] hover:bg-[#0b6f63]')
          return (
            <button
              key={opt.id}
              ref={(element) => { refs.current[index] = element }}
              type="button"
              role="radio"
              tabIndex={isActive && !compareMode ? 0 : -1}
              aria-checked={isActive}
              aria-disabled={compareMode}
              aria-label={`${opt.label} channel. ${descriptions[opt.id]}`}
              title={descriptions[opt.id]}
              onClick={() => !compareMode && setChannel(opt.id)}
              onKeyDown={(event) => {
                if (compareMode) return
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(index + 1) }
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(index - 1) }
                if (event.key === 'Home') { event.preventDefault(); move(0) }
                if (event.key === 'End') { event.preventDefault(); move(CHANNEL_OPTIONS.length - 1) }
              }}
              className={`relative flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center text-[11.5px] font-semibold text-white transition-colors ${darkFocusRing} ${brandClass} ${isActive ? 'border-white shadow-sm ring-2 ring-white/80' : 'border-white/30'} ${compareMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <BrandIcon brand={opt.id} />
              <span className="sr-only">{opt.label}</span>
              {isActive && <Check size={13} aria-hidden="true" className="shrink-0" />}
              <span className="sr-only">{isActive ? 'Selected' : 'Not selected'}. {descriptions[opt.id]}</span>
            </button>
          )
        })}
      </div>
      <button type="button" onClick={toggleCompareMode} aria-pressed={compareMode} className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium cursor-pointer transition-colors ${darkFocusRing} ${compareMode ? darkSolids.violet : darkTints.violet}`}>
        <Columns3 size={13} />
        {compareMode ? 'Comparing all channels' : 'Compare all channels'}
      </button>
    </div>
  )
}
