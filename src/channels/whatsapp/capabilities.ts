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
    'location',
    'otp',
    'payment_request',
    'product_catalog',
    'whatsapp_flow',
    'system_action',
  ],
  // WhatsApp interactive messages support at most 3 buttons in a row
  // (either quick-reply buttons or a single CTA-URL button) and list
  // messages support at most 10 rows total across up to 10 sections, each
  // with a 24-character row title. Button/chip labels cap at 20 characters.
  // Source: Meta's WhatsApp Cloud API interactive-message reference.
  maxSuggestedReplies: 3,
  maxSuggestedActions: 3,
  maxCarouselCards: 10,
  maxListRows: 10,
  maxButtonLabelLength: 20,
  maxListRowTitleLength: 24,
  fallbackNotes: {
    rich_card: 'WhatsApp has no standalone rich-card message; rendered using a generic image/text card.',
    carousel: 'WhatsApp has no native swipeable carousel in this simulator; rendered using a generic scrollable card row.',
    calendar_event: 'WhatsApp has no native calendar-invite card; rendered as a generic card.',
  },
}
