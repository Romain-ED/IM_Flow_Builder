import { z } from 'zod'
import { choiceSchema, messageSchema, variableMapSchema } from './messages'

export const channelIdSchema = z.enum(['rcs', 'whatsapp'])
export type ChannelId = z.infer<typeof channelIdSchema>

export const flowMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  channel: channelIdSchema.optional(),
  /** Exact inbound message required to enter an RCS scenario. */
  trigger: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /** Variable keys explicitly safe to include in the presenter live snapshot. */
  livePublicVariables: z.array(z.string()).optional(),
})
export type FlowMetadata = z.infer<typeof flowMetadataSchema>

export const safeExternalUrl = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => !/\s/.test(value), 'URL must not contain whitespace')
  .refine((value) => {
    if (value.startsWith('/')) return !value.startsWith('//')
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:' && Boolean(parsed.hostname)
    } catch {
      return false
    }
  }, 'URL must be HTTPS or app-relative')

const imageDataUrl = /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4}))$/i

export const MAX_EDITOR_IMAGE_DATA_URL_LENGTH = 4 * 1024 * 1024
export const MAX_EDITOR_IMAGE_FILE_BYTES = Math.floor(
  (MAX_EDITOR_IMAGE_DATA_URL_LENGTH - 'data:image/svg+xml;base64,'.length) * 3 / 4,
)

export const safeImageSource = safeExternalUrl

export const safeEditorImageSource = z.string().min(1).superRefine((value, context) => {
  if (value.startsWith('data:')) {
    if (value.length > MAX_EDITOR_IMAGE_DATA_URL_LENGTH) {
      context.addIssue({ code: 'custom', message: 'Image data URL is too large' })
      return
    }
    if (!imageDataUrl.test(value)) {
      context.addIssue({ code: 'custom', message: 'Image data must be valid bounded base64' })
    }
    return
  }

  if (!safeExternalUrl.safeParse(value).success) {
    context.addIssue({ code: 'custom', message: 'Image source must be app-relative or HTTPS' })
  }
})

const profileText = (max: number) => z.string().min(1).max(max)

export const rcsProfileSchema = z.object({
  displayName: profileText(80),
  subtitle: profileText(160),
  brandLabel: profileText(80),
  phone: profileText(32),
  websiteLabel: profileText(2048),
  websiteUrl: safeExternalUrl,
  email: z.string().email().max(254),
  imageCount: z.number().int().nonnegative().default(0),
  imageUrls: z.array(safeImageSource).max(12).default([]),
  privacyPolicyUrl: safeExternalUrl.optional(),
  termsUrl: safeExternalUrl.optional(),
}).superRefine((profile, context) => {
  if ((profile.imageCount === 0) !== (profile.imageUrls.length === 0)) {
    context.addIssue({ code: 'custom', path: ['imageCount'], message: 'imageCount and imageUrls must both be empty or populated' })
  }
  if (profile.imageCount < profile.imageUrls.length) {
    context.addIssue({ code: 'custom', path: ['imageCount'], message: 'imageCount cannot be less than imageUrls length' })
  }
})
export type RcsProfile = z.infer<typeof rcsProfileSchema>

export const brandDefinitionSchema = z.object({
  name: profileText(80),
  shortName: profileText(80).optional(),
  avatar: safeEditorImageSource.optional(),
  logo: safeEditorImageSource.optional(),
  banner: safeEditorImageSource.optional(),
  verified: z.boolean().optional(),
  /** Subtitle shown under the name in the chat header (e.g. "Customer support"). Defaults to a channel-appropriate label when omitted. */
  description: z.string().max(160).optional(),
  website: safeExternalUrl.optional(),
  supportPhone: z.string().max(32).optional(),
  email: z.string().email().max(254).optional(),
  rcsProfile: rcsProfileSchema.optional(),
})
export type BrandDefinition = z.infer<typeof brandDefinitionSchema>

export const editableBrandOverrideSchema = brandDefinitionSchema.pick({
  name: true,
  shortName: true,
  avatar: true,
  logo: true,
  banner: true,
  verified: true,
  description: true,
  website: true,
  supportPhone: true,
  email: true,
})
export const editableBrandPatchSchema = editableBrandOverrideSchema.partial()
export type EditableBrandOverride = z.infer<typeof editableBrandOverrideSchema>

export const flowDefaultsSchema = z.object({
  messageDelayMs: z.number().nonnegative().optional(),
  typingDurationMs: z.number().nonnegative().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  showTimestamps: z.boolean().optional(),
})
export type FlowDefaults = z.infer<typeof flowDefaultsSchema>

export const conditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'exists',
  'contains',
  'greater_than',
  'less_than',
])
export type ConditionOperator = z.infer<typeof conditionOperatorSchema>

export const conditionSchema = z.object({
  variable: z.string(),
  operator: conditionOperatorSchema,
  value: z
    .union([z.string(), z.number(), z.boolean(), z.null()])
    .optional(),
})
export type Condition = z.infer<typeof conditionSchema>

export const flowNodeSchema = z.object({
  id: z.string(),
  /** Optional human label shown in the flow inspector / node picker. */
  label: z.string().optional(),
  /** Variables to set unconditionally when this node is entered. */
  set: variableMapSchema.optional(),
  /** Sequential messages to play when this node is entered. */
  messages: z.array(messageSchema).optional(),
  /** Persistent suggested-reply / button bar shown once messages finish. */
  actions: z.array(choiceSchema).optional(),
  /** Conditional branch evaluated after messages/set, before actions/next. */
  condition: conditionSchema.optional(),
  then: z.string().optional(),
  else: z.string().optional(),
  /** Automatic transition once messages finish (used when no interaction). */
  next: z.string().optional(),
  /** While this node is current, any typed text (even a global trigger keyword) is sent and moves the flow here. */
  freeTextNext: z.string().optional(),
  /** Marks this node as a deliberate end of the scenario. */
  end: z.boolean().optional(),
})
export type FlowNode = z.infer<typeof flowNodeSchema>

/**
 * A global keyword→node route, checked against whatever the user types
 * into the composer — not tied to any specific node, so it works as an
 * "anytime" escape hatch (e.g. "type CANCEL anytime"), the way many real
 * WhatsApp/RCS bots implement keyword commands. See
 * `engine/triggerMatcher.ts` for matching semantics.
 */
export const triggerSchema = z.object({
  /** Any one of these appearing as a whole word in the typed text matches (case-insensitive unless caseSensitive is set). */
  keywords: z.array(z.string()).min(1),
  next: z.string(),
  set: variableMapSchema.optional(),
  caseSensitive: z.boolean().optional(),
})
export type Trigger = z.infer<typeof triggerSchema>

export const flowDefinitionSchema = z.object({
  version: z.string(),
  metadata: flowMetadataSchema,
  brand: brandDefinitionSchema,
  defaults: flowDefaultsSchema.optional(),
  variables: variableMapSchema.optional(),
  /** Global keyword routes, checked on every free-text send regardless of the current node. */
  triggers: z.array(triggerSchema).optional(),
  start: z.string(),
  nodes: z.array(flowNodeSchema).min(1),
})
export type FlowDefinition = z.infer<typeof flowDefinitionSchema>

export * from './messages'
