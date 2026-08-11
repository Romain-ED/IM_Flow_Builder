import type { ChannelCapabilities } from '../capabilities'

/** Generic mode supports everything — it's the neutral fallback renderer. */
export const genericCapabilities: ChannelCapabilities = {
  channel: 'generic',
  label: 'Generic Messaging',
  supportedMessageTypes: [
    'text',
    'image',
    'video',
    'document',
    'rich_card',
    'carousel',
    'suggested_replies',
    'suggested_actions',
    'list',
    'input',
    'flight_card',
    'boarding_pass',
  ],
  maxSuggestedReplies: 8,
  maxSuggestedActions: 6,
  maxCarouselCards: 10,
  maxListRows: 20,
  fallbackNotes: {},
}
