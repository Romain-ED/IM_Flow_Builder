import type { ChannelId } from '../schema/flow'
import type { MessageType } from '../schema/messages'

export interface ChannelCapabilities {
  channel: ChannelId
  label: string
  /** Message types this channel can render using its native visual language. */
  supportedMessageTypes: MessageType[]
  maxSuggestedReplies: number
  maxSuggestedActions: number
  maxCarouselCards: number
  maxListRows: number
  /** Human-readable explanation shown in debug mode when a type falls back. */
  fallbackNotes: Partial<Record<MessageType, string>>
}

export function isMessageTypeSupported(
  capabilities: ChannelCapabilities,
  type: MessageType,
): boolean {
  return capabilities.supportedMessageTypes.includes(type)
}

export function getFallbackNote(
  capabilities: ChannelCapabilities,
  type: MessageType,
): string {
  return (
    capabilities.fallbackNotes[type] ??
    `This component is not natively supported on ${capabilities.label}. Rendered using a generic fallback.`
  )
}
