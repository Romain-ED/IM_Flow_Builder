import { useSimulatorStore } from '../../store/simulatorStore'
import { channelRenderers } from '../../channels/registry'
import { ChannelProvider } from '../../app/ChannelContext'
import type { ChannelId } from '../../schema/flow'
import { ConversationView } from './ConversationView'
import { ActionBar } from './ActionBar'
import { Composer } from './Composer'
import { ListSheet } from './ListSheet'
import { BoardingPassPreviewModal } from './BoardingPassPreviewModal'
import { ExternalActionModal } from './ExternalActionModal'
import { Toast } from './Toast'

interface PhoneScreenProps {
  /** Pins this screen to a specific channel, used by Compare Mode. Defaults to the store's global channel. */
  channelOverride?: ChannelId
}

export function PhoneScreen({ channelOverride }: PhoneScreenProps = {}) {
  const flow = useSimulatorStore((s) => s.flow)
  const storeChannel = useSimulatorStore((s) => s.channel)
  const channel = channelOverride ?? storeChannel

  if (!flow) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400 px-6 text-center">
        No scenario loaded. Use the Scenario panel to load or paste a flow.
      </div>
    )
  }

  const ChannelRenderer = channelRenderers[channel]

  return (
    <ChannelProvider channel={channel}>
      <ChannelRenderer brand={flow.brand}>
        <ConversationView />
        <ActionBar />
        <Composer />
        <ListSheet />
        <BoardingPassPreviewModal />
        <ExternalActionModal />
        <Toast />
      </ChannelRenderer>
    </ChannelProvider>
  )
}
