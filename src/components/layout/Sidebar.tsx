import { ScenarioControls } from '../controls/ScenarioControls'
import { ChannelSelector } from '../controls/ChannelSelector'
import { PhonePlatformSelector } from '../controls/PhonePlatformSelector'
import { DebugOptions } from '../controls/DebugOptions'
import { PlaybackControls } from '../controls/PlaybackControls'
import { LiveRcsControls } from '../controls/LiveRcsControls'
import { darkSurface } from '../../utils/darkChrome'

export function Sidebar({ onOpenEditor }: { onOpenEditor: () => void }) {
  return (
    <aside className={`flex flex-col gap-5 h-full overflow-y-auto thin-scrollbar-dark p-4 ${darkSurface.sidebar} ${darkSurface.text}`}>
      <ScenarioControls onOpenEditor={onOpenEditor} />
      <Divider />
      <ChannelSelector />
      <PhonePlatformSelector />
      <Divider />
      <LiveRcsControls />
      <Divider />
      <DebugOptions />
      <Divider />
      <PlaybackControls />
    </aside>
  )
}

function Divider() {
  return <div className={`h-px ${darkSurface.divider}`} />
}
