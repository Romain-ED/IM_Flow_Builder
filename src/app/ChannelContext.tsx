import { createContext, useContext, type ReactNode } from 'react'
import type { ChannelId } from '../schema/flow'
import { useSimulatorStore } from '../store/simulatorStore'

const ChannelContext = createContext<ChannelId | null>(null)

/**
 * Provides the channel a phone screen should render as. Normally that's
 * just the store's global `channel`, but Compare Mode renders several phone
 * screens at once, each pinned to a different channel — this lets every
 * descendant (conversation view, composer, message renderer…)
 * ask "which channel am I?" without prop-drilling it through every layer.
 */
export function ChannelProvider({ channel, children }: { channel: ChannelId; children: ReactNode }) {
  return <ChannelContext.Provider value={channel}>{children}</ChannelContext.Provider>
}

export function useActiveChannel(): ChannelId {
  const fromContext = useContext(ChannelContext)
  // Falls back to the global store channel so any component can call this
  // hook safely even outside a ChannelProvider (defensive, not the normal path).
  const storeChannel = useSimulatorStore((s) => s.channel)
  return fromContext ?? storeChannel
}
