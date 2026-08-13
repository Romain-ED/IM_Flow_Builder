import type { ChannelCapabilities } from '../capabilities'

export const whatsappCapabilities: ChannelCapabilities = {
  channel: 'whatsapp',
  label: 'WhatsApp Business',
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
    'location',
    'product_catalog',
    'whatsapp_flow',
    'system_action',
  ],
  // WhatsApp interactive messages support a header (image/video/document) +
  // body + footer + up to 3 buttons (rich_card models this). Carousels are
  // real too, via a Meta-approved Carousel Template: up to 10 cards, each
  // with an image/video header, optional body text, and up to 2 buttons
  // (quick-reply, phone-number, or URL — not arbitrary action types). List
  // messages support at most 10 rows total across up to 10 sections, each
  // with a 24-character row title. Button/chip labels cap at 20 characters.
  // An interactive message's optional header is text (<=60 chars) OR media
  // (image/video/document) — never both — and its optional footer is plain
  // text, also capped at 60 chars. List messages support the same
  // header/footer wrapper, but their header can only be text (no media).
  // Source: Meta's WhatsApp Cloud API interactive-message reference and
  // Carousel Template docs.
  maxSuggestedReplies: 3,
  maxSuggestedActions: 3,
  maxCarouselCards: 10,
  maxCarouselCardButtons: 2,
  maxListRows: 10,
  maxButtonLabelLength: 20,
  maxListRowTitleLength: 24,
  maxHeaderTextLength: 60,
  maxFooterTextLength: 60,
  fallbackNotes: {
    // These have no official WhatsApp equivalent at all — not even as a
    // template — so the built-in scenarios avoid them on this channel;
    // this note only fires if a custom scenario still uses one.
    flight_card: 'WhatsApp has no flight-card message; a real integration sends this as plain text or an interactive message with an image header.',
    boarding_pass: 'WhatsApp has no boarding-pass message; a real integration sends the pass as a document (PDF/image) with a text summary and reply buttons.',
    otp: 'WhatsApp has no code-entry message; a real one-time code is sent via an Authentication Template (fixed text + a "Copy code" button) — the code is never typed back into the chat.',
    payment_request: 'WhatsApp has no payment-request message; a real integration uses an interactive message with a CTA-URL button that opens a payment link.',
    calendar_event: 'WhatsApp has no calendar-invite message; a real integration sends plain text with a reply button such as "Add to calendar".',
  },
}
