import { ScenarioControls } from '../controls/ScenarioControls'
import { ChannelSelector } from '../controls/ChannelSelector'
import { VariablesEditor } from '../controls/VariablesEditor'
import { DebugOptions } from '../controls/DebugOptions'
import { PlaybackControls } from '../controls/PlaybackControls'

export function Sidebar({ onOpenEditor }: { onOpenEditor: () => void }) {
  return (
    <aside className="flex flex-col gap-5 h-full overflow-y-auto thin-scrollbar p-4">
      <ScenarioControls onOpenEditor={onOpenEditor} />
      <Divider />
      <ChannelSelector />
      <Divider />
      <VariablesEditor />
      <Divider />
      <DebugOptions />
      <Divider />
      <PlaybackControls />
    </aside>
  )
}

function Divider() {
  return <div className="h-px bg-slate-100" />
}
