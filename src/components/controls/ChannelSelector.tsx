import { useSimulatorStore } from '../../store/simulatorStore'
import { CHANNEL_OPTIONS } from '../../channels/registry'
import { channelThemes } from '../../channels/theme'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'

export function ChannelSelector() {
  const channel = useSimulatorStore((s) => s.channel)
  const setChannel = useSimulatorStore((s) => s.setChannel)

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={sectionAccents.channel}>Channel</SectionHeading>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Channel">
        {CHANNEL_OPTIONS.map((opt) => {
          const isActive = channel === opt.id
          const accentColor = channelThemes[opt.id].accent
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setChannel(opt.id)}
              className={`rounded-lg border px-2 py-2 text-[11.5px] font-semibold text-center transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${
                isActive ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              style={isActive ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
            >
              {opt.id.toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
