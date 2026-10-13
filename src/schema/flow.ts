import { z } from 'zod'
import { choiceSchema, messageSchema, variableMapSchema } from './messages'

export const channelIdSchema = z.enum(['rcs', 'whatsapp'])
export type ChannelId = z.infer<typeof channelIdSchema>

export const flowMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  channel: channelIdSchema.optional(),
  tags: z.array(z.string()).optional(),
  /** Variable keys explicitly safe to include in the presenter live snapshot. */
  livePublicVariables: z.array(z.string()).optional(),
})
export type FlowMetadata = z.infer<typeof flowMetadataSchema>

const safeExternalUrl = z
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

const profileText = (max: number) => z.string().min(1).max(max)

export const rcsProfileSchema = z.object({
  displayName: profileText(80),
  subtitle: profileText(160),
  brandLabel: profileText(80),
  phone: profileText(32),
  websiteLabel: profileText(2048),
  websiteUrl: safeExternalUrl,
  email: z.string().email().max(254),
  imageCount: z.number().int().nonnegative(),
  imageUrls: z.array(safeExternalUrl).min(3).max(12),
  privacyPolicyUrl: safeExternalUrl.optional(),
  termsUrl: safeExternalUrl.optional(),
})
export type RcsProfile = z.infer<typeof rcsProfileSchema>

export const brandDefinitionSchema = z.object({
  name: profileText(80),
  shortName: profileText(80).optional(),
  avatar: z.string().optional(),
  logo: z.string().optional(),
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
