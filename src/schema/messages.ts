import { z } from 'zod'

/**
 * Scalar value usable for flow variables. Kept intentionally narrow (no nested
 * objects/arrays) so templating and condition evaluation stay simple and safe.
 */
export const variableValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])
export type VariableValue = z.infer<typeof variableValueSchema>

export const variableMapSchema = z.record(z.string(), variableValueSchema)
export type VariableMap = z.infer<typeof variableMapSchema>

/**
 * A "choice" is the lightweight interaction primitive used by node-level
 * `actions`, `suggested_replies` options, and `list` rows. It intentionally
 * has no `type` discriminant in authored JSON/YAML (matches the spec's
 * examples) — it always means "navigate to another node, optionally setting
 * variables first".
 */
export const choiceSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  description: z.string().optional(),
  next: z.string().optional(),
  set: variableMapSchema.optional(),
})
export type Choice = z.infer<typeof choiceSchema>

/**
 * Richer action union used by `suggested_actions`, and as buttons attached to
 * rich cards, carousel cards, boarding passes and flight cards. Unlike
 * `Choice`, these are explicitly typed because they can represent simulated
 * external behaviour (opening a URL, dialing a number, etc.) rather than a
 * pure in-flow navigation.
 */
const actionBase = { label: z.string() }

export const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('reply'),
    ...actionBase,
    next: z.string().optional(),
    set: variableMapSchema.optional(),
  }),
  z.object({
    type: z.literal('open_url'),
    ...actionBase,
    url: z.string(),
  }),
  z.object({
    type: z.literal('call'),
    ...actionBase,
    phoneNumber: z.string(),
  }),
  z.object({
    type: z.literal('location'),
    ...actionBase,
    address: z.string().optional(),
    query: z.string().optional(),
  }),
  z.object({
    type: z.literal('calendar'),
    ...actionBase,
    title: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string().optional(),
  }),
  z.object({
    type: z.literal('custom'),
    ...actionBase,
    message: z.string().optional(),
  }),
])
export type Action = z.infer<typeof actionSchema>

export const senderSchema = z.enum(['business', 'user'])
export type Sender = z.infer<typeof senderSchema>

const messageBase = {
  id: z.string().optional(),
  sender: senderSchema.optional().default('business'),
  /** Milliseconds to wait before this message appears (overrides node/global defaults). */
  delayMs: z.number().nonnegative().optional(),
  /** Milliseconds of typing indicator shown before this message (business only). */
  typingMs: z.number().nonnegative().optional(),
  /** Explicitly disable the typing indicator for this message. */
  showTyping: z.boolean().optional(),
}

export const textMessageSchema = z.object({
  type: z.literal('text'),
  ...messageBase,
  text: z.string(),
})

export const imageMessageSchema = z.object({
  type: z.literal('image'),
  ...messageBase,
  url: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
})

export const videoMessageSchema = z.object({
  type: z.literal('video'),
  ...messageBase,
  url: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  caption: z.string().optional(),
  durationLabel: z.string().optional(),
})

export const documentMessageSchema = z.object({
  type: z.literal('document'),
  ...messageBase,
  filename: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fileType: z.string().optional(),
  url: z.string().optional(),
})

export const richCardMessageSchema = z.object({
  type: z.literal('rich_card'),
  ...messageBase,
  image: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  mediaHeight: z.enum(['short', 'medium', 'tall']).optional(),
  orientation: z.enum(['horizontal', 'vertical']).optional(),
  actions: z.array(actionSchema).optional(),
})

export const carouselCardSchema = z.object({
  id: z.string(),
  image: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  badges: z.array(z.string()).optional(),
  actions: z.array(actionSchema).optional(),
})
export type CarouselCard = z.infer<typeof carouselCardSchema>

export const carouselMessageSchema = z.object({
  type: z.literal('carousel'),
  ...messageBase,
  cards: z.array(carouselCardSchema).min(1),
})

export const suggestedRepliesMessageSchema = z.object({
  type: z.literal('suggested_replies'),
  ...messageBase,
  options: z.array(choiceSchema).min(1),
})

export const suggestedActionsMessageSchema = z.object({
  type: z.literal('suggested_actions'),
  ...messageBase,
  actions: z.array(actionSchema).min(1),
})

export const listRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  next: z.string().optional(),
  set: variableMapSchema.optional(),
})
export type ListRow = z.infer<typeof listRowSchema>

export const listSectionSchema = z.object({
  title: z.string().optional(),
  rows: z.array(listRowSchema).min(1),
})
export type ListSection = z.infer<typeof listSectionSchema>

export const listMessageSchema = z.object({
  type: z.literal('list'),
  ...messageBase,
  title: z.string(),
  description: z.string().optional(),
  buttonLabel: z.string(),
  sections: z.array(listSectionSchema).min(1),
})

export const inputMessageSchema = z.object({
  type: z.literal('input'),
  ...messageBase,
  inputType: z.enum(['text', 'email', 'phone', 'numeric', 'date']),
  placeholder: z.string().optional(),
  submitLabel: z.string().optional(),
  variable: z.string(),
  next: z.string().optional(),
})

const airportSchema = z.object({
  code: z.string(),
  city: z.string(),
})

export const flightCardMessageSchema = z.object({
  type: z.literal('flight_card'),
  ...messageBase,
  airline: z.string(),
  flightNumber: z.string(),
  origin: airportSchema,
  destination: airportSchema,
  departureTime: z.string(),
  arrivalTime: z.string(),
  date: z.string(),
  terminal: z.string().optional(),
  gate: z.string().optional(),
  bookingReference: z.string().optional(),
  status: z.string().optional(),
})

/**
 * Buttons specific to the boarding pass component. Distinct from the generic
 * `Action` union because "download"/"add to wallet"/"view" trigger built-in,
 * locally-simulated behaviour (file generation, wallet toast, preview modal)
 * that the engine provides for free on every scenario — authors don't need
 * to wire it up. If `actions` is omitted the component falls back to the
 * standard trio (download, add to wallet, view).
 */
export const boardingPassActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('download'), label: z.string(), next: z.string().optional() }),
  z.object({ type: z.literal('add_to_wallet'), label: z.string(), next: z.string().optional() }),
  z.object({ type: z.literal('view'), label: z.string() }),
  z.object({
    type: z.literal('reply'),
    label: z.string(),
    next: z.string().optional(),
    set: variableMapSchema.optional(),
  }),
])
export type BoardingPassAction = z.infer<typeof boardingPassActionSchema>

export const boardingPassMessageSchema = z.object({
  type: z.literal('boarding_pass'),
  ...messageBase,
  passengerName: z.string(),
  airline: z.string(),
  airlineLogo: z.string().optional(),
  flightNumber: z.string(),
  date: z.string(),
  origin: airportSchema,
  destination: airportSchema,
  departureTime: z.string(),
  boardingTime: z.string().optional(),
  gate: z.string().optional(),
  terminal: z.string().optional(),
  seat: z.string().optional(),
  boardingGroup: z.string().optional(),
  bookingReference: z.string(),
  cabinClass: z.string().optional(),
  frequentFlyerNumber: z.string().optional(),
  frequentFlyerStatus: z.string().optional(),
  actions: z.array(boardingPassActionSchema).optional(),
})

export const DEFAULT_BOARDING_PASS_ACTIONS: BoardingPassAction[] = [
  { type: 'download', label: 'Download boarding pass' },
  { type: 'add_to_wallet', label: 'Add to wallet' },
  { type: 'view', label: 'View boarding pass' },
]

export const locationMessageSchema = z.object({
  type: z.literal('location'),
  ...messageBase,
  label: z.string(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export const otpMessageSchema = z.object({
  type: z.literal('otp'),
  ...messageBase,
  prompt: z.string().optional(),
  codeLength: z.number().int().min(4).max(8).optional(),
  variable: z.string(),
  next: z.string().optional(),
})

export const paymentRequestMessageSchema = z.object({
  type: z.literal('payment_request'),
  ...messageBase,
  title: z.string(),
  description: z.string().optional(),
  amount: z.string(),
  next: z.string().optional(),
  set: variableMapSchema.optional(),
})

export const calendarEventMessageSchema = z.object({
  type: z.literal('calendar_event'),
  ...messageBase,
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  next: z.string().optional(),
  set: variableMapSchema.optional(),
})

export const catalogProductSchema = z.object({
  id: z.string(),
  image: z.string().optional(),
  title: z.string(),
  price: z.string(),
  description: z.string().optional(),
})
export type CatalogProduct = z.infer<typeof catalogProductSchema>

export const productCatalogMessageSchema = z.object({
  type: z.literal('product_catalog'),
  ...messageBase,
  title: z.string().optional(),
  products: z.array(catalogProductSchema).min(1),
})

export const whatsappFlowMessageSchema = z.object({
  type: z.literal('whatsapp_flow'),
  ...messageBase,
  title: z.string(),
  description: z.string().optional(),
  cta: z.string().optional(),
  next: z.string().optional(),
  set: variableMapSchema.optional(),
})

/** Pseudo-message: pauses the sequence without rendering anything. */
export const delayMessageSchema = z.object({
  type: z.literal('delay'),
  id: z.string().optional(),
  duration: z.number().nonnegative(),
})

/**
 * Pseudo-message: shows the channel-appropriate typing indicator for
 * `duration` ms, then disappears. Unlike the automatic per-message typing
 * indicator (`typingMs`/`showTyping` on `messageBase`), this is an explicit,
 * standalone beat an author can place anywhere in `messages` — e.g. before a
 * `system_action`, which suppresses the automatic indicator since it isn't a
 * business chat message. Never stored in conversation history.
 */
export const typingMessageSchema = z.object({
  type: z.literal('typing'),
  id: z.string().optional(),
  duration: z.number().nonnegative().optional(),
})

export const systemActionKindSchema = z.enum([
  'download',
  'wallet',
  'open_url',
  'copy',
  'calendar',
  'generic',
])
export type SystemActionKind = z.infer<typeof systemActionKindSchema>

/**
 * A compact, simulator-side confirmation notice (e.g. "Boarding pass
 * downloaded") rendered as a centered system event rather than a business or
 * user chat bubble — it represents something the local simulator did, not an
 * actual RCS/WhatsApp message.
 */
export const systemActionMessageSchema = z.object({
  type: z.literal('system_action'),
  ...messageBase,
  action: systemActionKindSchema,
  title: z.string(),
  description: z.string().optional(),
})

export const messageSchema = z.discriminatedUnion('type', [
  textMessageSchema,
  imageMessageSchema,
  videoMessageSchema,
  documentMessageSchema,
  richCardMessageSchema,
  carouselMessageSchema,
  suggestedRepliesMessageSchema,
  suggestedActionsMessageSchema,
  listMessageSchema,
  inputMessageSchema,
  flightCardMessageSchema,
  boardingPassMessageSchema,
  locationMessageSchema,
  otpMessageSchema,
  paymentRequestMessageSchema,
  calendarEventMessageSchema,
  productCatalogMessageSchema,
  whatsappFlowMessageSchema,
  systemActionMessageSchema,
  delayMessageSchema,
  typingMessageSchema,
])
export type Message = z.infer<typeof messageSchema>
export type MessageType = Message['type']

/** Messages that actually render a bubble (i.e. everything except the `delay`/`typing` pseudo-messages). */
export type RenderableMessage = Exclude<Message, { type: 'delay' } | { type: 'typing' }>

/** Message types that pause the flow awaiting a user interaction. */
export const INLINE_INTERACTIVE_TYPES = [
  'suggested_replies',
  'list',
  'input',
] as const
export type InlineInteractiveType = (typeof INLINE_INTERACTIVE_TYPES)[number]
