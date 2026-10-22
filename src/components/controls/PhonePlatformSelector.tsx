import { useRef } from 'react'
import { Check } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { PhonePlatform } from '../../schema/platform'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkFocusRing } from '../../utils/darkChrome'

const OPTIONS: { id: PhonePlatform; label: string; detail: string; description: string }[] = [
  { id: 'ios', label: 'iPhone', detail: 'iOS', description: 'Apple iPhone preview' },
  { id: 'android', label: 'Android', detail: 'Pixel-style', description: 'Android Pixel-style preview' },
]

export function PhonePlatformSelector() {
  const phonePlatform = useSimulatorStore((s) => s.phonePlatform)
  const setPhonePlatform = useSimulatorStore((s) => s.setPhonePlatform)
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const move = (index: number) => {
    const next = (index + OPTIONS.length) % OPTIONS.length
    setPhonePlatform(OPTIONS[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={sectionAccents.channel} tone="dark">Phone</SectionHeading>
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Phone platform">
        {OPTIONS.map((option, index) => {
          const isActive = phonePlatform === option.id
          return (
            <button key={option.id} ref={(element) => { refs.current[index] = element }} type="button" role="radio" tabIndex={isActive ? 0 : -1} aria-checked={isActive} aria-label={`${option.label}. ${option.description}`} title={option.description} onClick={() => setPhonePlatform(option.id)} onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(index + 1) }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(index - 1) }
              if (event.key === 'Home') { event.preventDefault(); move(0) }
              if (event.key === 'End') { event.preventDefault(); move(OPTIONS.length - 1) }
            }} className={`relative flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${darkFocusRing} ${isActive ? (option.id === 'ios' ? 'border-white bg-black text-white ring-2 ring-white/80' : 'border-white bg-[#137a46] text-white ring-2 ring-white/80') : (option.id === 'ios' ? 'border-slate-600 bg-slate-950 text-white hover:bg-slate-800' : 'border-[#3ddc84] bg-[#137a46] text-white hover:bg-[#0d6339]')} cursor-pointer`}>
              <span className={`flex h-7 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/15 ${option.id === 'ios' ? 'px-0.5' : 'px-0.5'}`}>
                <img src={option.id === 'ios' ? '/kisspng-apple-iphone-8-plus-apple-iphone-7-plus-iphone-5s-5b07c88e02bb69.0939343215272367500112.jpg' : '/android.png'} alt="" aria-hidden="true" className="h-full w-full object-contain" />
              </span>
              <span className="min-w-0"><span className="block truncate text-[11.5px] font-semibold">{option.label}</span><span className="block truncate text-[9.5px] text-slate-200">{option.detail}</span></span>
              {isActive && <Check size={13} aria-hidden="true" className="ml-auto shrink-0" />}
              <span className="sr-only">{isActive ? 'Selected' : 'Not selected'}. {option.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
