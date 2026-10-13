import { Smartphone } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { PhonePlatform } from '../../schema/platform'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'

const OPTIONS: { id: PhonePlatform; label: string; detail: string }[] = [
  { id: 'ios', label: 'iPhone', detail: 'iOS' },
  { id: 'android', label: 'Android', detail: 'Pixel-style' },
]

export function PhonePlatformSelector() {
  const phonePlatform = useSimulatorStore((s) => s.phonePlatform)
  const setPhonePlatform = useSimulatorStore((s) => s.setPhonePlatform)

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={sectionAccents.channel}>Phone</SectionHeading>
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Phone platform">
        {OPTIONS.map((option) => {
          const isActive = phonePlatform === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setPhonePlatform(option.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${
                isActive
                  ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}>
                <Smartphone size={15} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-semibold">{option.label}</span>
                <span className={`block truncate text-[9.5px] ${isActive ? 'text-white/65' : 'text-slate-400'}`}>{option.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
