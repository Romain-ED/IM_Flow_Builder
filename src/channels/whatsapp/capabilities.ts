import type { ChannelCapabilities } from '../capabilities'

export const whatsappCapabilities: ChannelCapabilities = {
  channel: 'whatsapp',
  label: 'WhatsApp Business',
  supportedMessageTypes: [
    'text',
    'image',
    'video',
    'document',
    'suggested_replies',
    'suggested_actions',
    'list',
    'input',
    'flight_card',
    'boarding_pass',
  ],
  maxSuggestedReplies: 3,
  maxSuggestedActions: 2,
  maxCarouselCards: 10,
  maxListRows: 10,
  fallbackNotes: {
    rich_card: 'WhatsApp has no standalone rich-card message; rendered using a generic image/text card.',
    carousel: 'WhatsApp has no native swipeable carousel in this simulator; rendered using a generic scrollable card row.',
  },
}
