import { useRef } from 'react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { BrandIcon } from './BrandIcon'
import { CHANNEL_OPTIONS } from '../../channels/registry'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkFocusRing } from '../../utils/darkChrome'

const descriptions: Record<string, string> = { rcs: 'Google Messages rich messaging', whatsapp: 'Meta WhatsApp messaging' }

export function ChannelSelector() {
  const channel = useSimulatorStore((s) => s.channel)
  const setChannel = useSimulatorStore((s) => s.setChannel)
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const move = (index: number) => {
    const next = (index + CHANNEL_OPTIONS.length) % CHANNEL_OPTIONS.length
    setChannel(CHANNEL_OPTIONS[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={sectionAccents.channel} tone="dark">Channel</SectionHeading>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Channel">
        {CHANNEL_OPTIONS.map((opt, index) => {
          const isActive = channel === opt.id
          const brandClass = opt.id === 'rcs' ? (isActive ? 'bg-[#1a73e8]' : 'bg-[#4285f4] hover:bg-[#1a73e8]') : (isActive ? 'bg-[#128c7e]' : 'bg-[#128c7e] hover:bg-[#0b6f63]')
          return (
            <button
              key={opt.id}
              ref={(element) => { refs.current[index] = element }}
              type="button"
              role="radio"
              tabIndex={isActive ? 0 : -1}
              aria-checked={isActive}
              aria-label={`${opt.label} channel. ${descriptions[opt.id]}`}
              title={opt.label}
              onClick={() => setChannel(opt.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(index + 1) }
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(index - 1) }
                if (event.key === 'Home') { event.preventDefault(); move(0) }
                if (event.key === 'End') { event.preventDefault(); move(CHANNEL_OPTIONS.length - 1) }
              }}
              className={`flex h-9 w-11 items-center justify-center rounded-lg border text-white transition ${darkFocusRing} ${brandClass} ${isActive ? 'border-white/20 shadow-sm ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-900' : 'border-transparent opacity-45 grayscale-[35%] hover:opacity-90 hover:grayscale-0'} cursor-pointer`}
            >
              <BrandIcon brand={opt.id} />
              <span className="sr-only">{isActive ? 'Selected' : 'Not selected'}. {descriptions[opt.id]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
