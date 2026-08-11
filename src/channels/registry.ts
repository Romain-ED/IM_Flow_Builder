import type { ComponentType, ReactNode } from 'react'
import type { BrandDefinition, ChannelId } from '../schema/flow'
import type { ChannelCapabilities } from './capabilities'
import { rcsCapabilities } from './rcs/capabilities'
import { whatsappCapabilities } from './whatsapp/capabilities'
import { genericCapabilities } from './generic/capabilities'
import { RcsRenderer } from './rcs/RcsRenderer'
import { WhatsAppRenderer } from './whatsapp/WhatsAppRenderer'
import { GenericRenderer } from './generic/GenericRenderer'

export const channelCapabilities: Record<ChannelId, ChannelCapabilities> = {
  rcs: rcsCapabilities,
  whatsapp: whatsappCapabilities,
  generic: genericCapabilities,
}

type ChannelRendererProps = { brand: BrandDefinition; children: ReactNode }

export const channelRenderers: Record<ChannelId, ComponentType<ChannelRendererProps>> = {
  rcs: RcsRenderer,
  whatsapp: WhatsAppRenderer,
  generic: GenericRenderer,
}

export const CHANNEL_OPTIONS: { id: ChannelId; label: string }[] = [
  { id: 'rcs', label: rcsCapabilities.label },
  { id: 'whatsapp', label: whatsappCapabilities.label },
  { id: 'generic', label: genericCapabilities.label },
]
