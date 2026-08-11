import type { ChannelCapabilities } from '../capabilities'

export const rcsCapabilities: ChannelCapabilities = {
  channel: 'rcs',
  label: 'RCS Business Messaging',
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
  maxSuggestedReplies: 11,
  maxSuggestedActions: 4,
  maxCarouselCards: 10,
  maxListRows: 20,
  fallbackNotes: {
    list: 'RCS has no native bottom-sheet list; rendered as a rich card with stacked options.',
  },
}
