import { useSimulatorStore } from '../../store/simulatorStore'
import { channelRenderers } from '../../channels/registry'
import { ConversationView } from './ConversationView'
import { ActionBar } from './ActionBar'
import { Composer } from './Composer'
import { ListSheet } from './ListSheet'
import { BoardingPassPreviewModal } from './BoardingPassPreviewModal'
import { ExternalActionModal } from './ExternalActionModal'
import { Toast } from './Toast'

export function PhoneScreen() {
  const flow = useSimulatorStore((s) => s.flow)
  const channel = useSimulatorStore((s) => s.channel)

  if (!flow) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400 px-6 text-center">
        No scenario loaded. Use the Scenario panel to load or paste a flow.
      </div>
    )
  }

  const ChannelRenderer = channelRenderers[channel]

  return (
    <ChannelRenderer brand={flow.brand}>
      <ConversationView />
      <ActionBar />
      <Composer />
      <ListSheet />
      <BoardingPassPreviewModal />
      <ExternalActionModal />
      <Toast />
    </ChannelRenderer>
  )
}
