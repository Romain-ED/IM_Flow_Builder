import { CHANNEL_OPTIONS } from '../../channels/registry'
import { channelThemes } from '../../channels/theme'
import { PhoneFrame } from './PhoneFrame'
import { PhoneScreen } from './PhoneScreen'

/**
 * Renders all three channels side by side, driven by the exact same live
 * conversation state — tapping a button in any one of them advances the
 * shared engine, and the others reflect it immediately.
 */
export function ComparePhones() {
  return (
    <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden p-6">
      <div className="flex gap-6 h-full min-w-fit mx-auto justify-center">
        {CHANNEL_OPTIONS.map((opt) => (
          <div key={opt.id} className="flex flex-col gap-2 w-[260px] shrink-0 h-full">
            <span
              className="self-center text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1"
              style={{ color: channelThemes[opt.id].accent, backgroundColor: `${channelThemes[opt.id].accent}1a` }}
            >
              {opt.label}
            </span>
            <div className="phone-viewport flex-1 min-h-0">
              <PhoneFrame>
                <PhoneScreen channelOverride={opt.id} />
              </PhoneFrame>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
