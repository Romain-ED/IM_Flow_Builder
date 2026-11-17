import { useRef } from 'react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { PhonePlatform } from '../../schema/platform'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { BrandIcon } from './BrandIcon'
import { darkFocusRing } from '../../utils/darkChrome'

const OPTIONS: { id: PhonePlatform; label: string; description: string; brand: 'apple' | 'android'; color: string }[] = [
  { id: 'ios', label: 'iPhone', description: 'Apple iPhone preview', brand: 'apple', color: 'bg-slate-950 hover:bg-slate-800' },
  { id: 'android', label: 'Android', description: 'Android Pixel-style preview', brand: 'android', color: 'bg-[#137a46] hover:bg-[#0d6339]' },
]

/** Icon-only iPhone / Android switch. Labels live in aria-label and tooltips. */
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
      <div className="flex gap-1.5" role="radiogroup" aria-label="Phone platform">
        {OPTIONS.map((option, index) => {
          const isActive = phonePlatform === option.id
          return (
            <button
              key={option.id}
              ref={(element) => { refs.current[index] = element }}
              type="button"
              role="radio"
              tabIndex={isActive ? 0 : -1}
              aria-checked={isActive}
              aria-label={`${option.label}. ${option.description}`}
              title={option.label}
              onClick={() => setPhonePlatform(option.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(index + 1) }
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(index - 1) }
                if (event.key === 'Home') { event.preventDefault(); move(0) }
                if (event.key === 'End') { event.preventDefault(); move(OPTIONS.length - 1) }
              }}
              className={`flex h-9 w-11 cursor-pointer items-center justify-center rounded-lg border text-white transition ${darkFocusRing} ${option.color} ${
                isActive
                  ? 'border-white shadow-sm ring-2 ring-indigo-600 ring-offset-1 ring-offset-white'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <BrandIcon brand={option.brand} />
              <span className="sr-only">{isActive ? 'Selected' : 'Not selected'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
