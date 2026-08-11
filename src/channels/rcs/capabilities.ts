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
    'location',
    'otp',
    'calendar_event',
  ],
  maxSuggestedReplies: 11,
  maxSuggestedActions: 4,
  maxCarouselCards: 10,
  maxListRows: 20,
  fallbackNotes: {
    list: 'RCS has no native bottom-sheet list; rendered as a rich card with stacked options.',
    payment_request: 'RCS has no native payment message; rendered as a generic card.',
    product_catalog: 'RCS has no native product catalog message; rendered as a generic scrollable card row.',
    whatsapp_flow: 'WhatsApp Flows are WhatsApp-specific; rendered here as a generic placeholder card.',
  },
}
