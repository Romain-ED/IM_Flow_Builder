import { Columns3 } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { CHANNEL_OPTIONS } from '../../channels/registry'
import { channelThemes } from '../../channels/theme'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkFocusRing, darkSegment, darkSolids, darkTints } from '../../utils/darkChrome'

export function ChannelSelector() {
  const channel = useSimulatorStore((s) => s.channel)
  const setChannel = useSimulatorStore((s) => s.setChannel)
  const compareMode = useSimulatorStore((s) => s.compareMode)
  const toggleCompareMode = useSimulatorStore((s) => s.toggleCompareMode)

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={sectionAccents.channel} tone="dark">Channel</SectionHeading>
      <div
        className={`grid grid-cols-2 gap-1.5 transition-opacity ${compareMode ? 'opacity-40 pointer-events-none' : ''}`}
        role="radiogroup"
        aria-label="Channel"
      >
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
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11.5px] font-semibold text-center transition-colors cursor-pointer ${darkFocusRing} ${
                isActive ? darkSegment.active : darkSegment.idle
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${isActive ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
              {opt.id.toUpperCase()}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={toggleCompareMode}
        aria-pressed={compareMode}
        className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium cursor-pointer transition-colors ${darkFocusRing} ${
          compareMode ? darkSolids.violet : darkTints.violet
        }`}
      >
        <Columns3 size={13} />
        {compareMode ? 'Comparing all channels' : 'Compare all channels'}
      </button>
    </div>
  )
}
