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
})
export type FlowMetadata = z.infer<typeof flowMetadataSchema>

export const brandDefinitionSchema = z.object({
  name: z.string(),
  shortName: z.string().optional(),
  avatar: z.string().optional(),
  logo: z.string().optional(),
  verified: z.boolean().optional(),
  website: z.string().optional(),
  supportPhone: z.string().optional(),
})
export type BrandDefinition = z.infer<typeof brandDefinitionSchema>

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

export const flowDefinitionSchema = z.object({
  version: z.string(),
  metadata: flowMetadataSchema,
  brand: brandDefinitionSchema,
  defaults: flowDefaultsSchema.optional(),
  variables: variableMapSchema.optional(),
  start: z.string(),
  nodes: z.array(flowNodeSchema).min(1),
})
export type FlowDefinition = z.infer<typeof flowDefinitionSchema>

export * from './messages'
