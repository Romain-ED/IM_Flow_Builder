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
    'input',
    'flight_card',
    'boarding_pass',
    'location',
    'otp',
    'calendar_event',
    'system_action',
  ],
  // Google's RCS Business Messaging API models message content as exactly
  // text, an uploaded file, or a rich card (standalone or in a carousel of
  // 2-10) — there is no native list/menu picker, unlike WhatsApp, so `list`
  // is intentionally absent from supportedMessageTypes below and falls back
  // to a rich card with stacked options instead (see fallbackNotes.list).
  // A message supports up to 11 suggestion chips; a rich card up to 4.
  // Card titles cap at 200 characters, descriptions at 2000, and chip
  // labels at 25. Source: developers.google.com/business-communications/
  // rcs-business-messaging (rich cards + agentMessages reference).
  maxSuggestedReplies: 11,
  maxSuggestedActions: 4,
  maxCarouselCards: 10,
  maxListRows: 20,
  maxButtonLabelLength: 25,
  maxCardTitleLength: 200,
  maxCardDescriptionLength: 2000,
  fallbackNotes: {
    list: 'RCS has no native bottom-sheet list; rendered as a rich card with stacked options.',
    payment_request: 'RCS has no native payment message; rendered as a generic card.',
    product_catalog: 'RCS has no native product catalog message; rendered as a generic scrollable card row.',
    whatsapp_flow: 'WhatsApp Flows are WhatsApp-specific; rendered here as a generic placeholder card.',
  },
}
