import { z } from 'zod'
import type { NormalizedMessage } from '../engine/types'
import { messageSchema, type RenderableMessage, type VariableMap } from '../schema/messages'

export const LIVE_UNKNOWN_NODE_ID = '__live_unknown_node__'

const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const liveActionSchema = z.object({
  type: z.enum(['reply', 'open_url', 'display_only']),
  label: z.string(),
})
const liveMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), sender: z.enum(['business', 'user']).optional(), text: z.string() }),
  z.object({ type: z.literal('image'), sender: z.enum(['business', 'user']).optional(), url: z.string().optional(), caption: z.string().optional() }),
  z.object({ type: z.literal('video'), sender: z.enum(['business', 'user']).optional(), url: z.string().optional(), caption: z.string().optional() }),
  z.object({ type: z.literal('file'), sender: z.enum(['business', 'user']).optional(), url: z.string().optional(), filename: z.string(), title: z.string().optional(), description: z.string().optional() }),
  z.object({ type: z.literal('document'), sender: z.enum(['business', 'user']).optional(), url: z.string().optional(), filename: z.string(), title: z.string().optional(), description: z.string().optional() }),
  z.object({ type: z.literal('card'), sender: z.enum(['business', 'user']).optional(), image: z.string().optional(), url: z.string().optional(), title: z.string(), description: z.string().optional(), actions: z.array(liveActionSchema).optional() }),
  z.object({ type: z.literal('rich_card'), sender: z.enum(['business', 'user']).optional(), image: z.string().optional(), title: z.string(), description: z.string().optional(), actions: z.array(liveActionSchema).optional() }),
  z.object({ type: z.literal('carousel'), sender: z.enum(['business', 'user']).optional(), cards: z.array(z.object({ id: z.string(), image: z.string().optional(), imageUrl: z.string().optional(), title: z.string(), subtitle: z.string().optional(), description: z.string().optional(), price: z.string().optional(), actions: z.array(liveActionSchema).optional() })) }),
  z.object({ type: z.literal('suggested_replies'), sender: z.enum(['business', 'user']).optional(), options: z.array(z.object({ label: z.string() })) }),
  z.object({ type: z.literal('suggested_actions'), sender: z.enum(['business', 'user']).optional(), actions: z.array(liveActionSchema) }),
])

const liveTimelineItemSchema = z.object({
  id: z.string().min(1),
  ordinal: z.number().int().nonnegative(),
  at: z.string(),
  nodeId: z.string().nullable().optional(),
  sender: z.enum(['business', 'user']),
  message: liveMessageSchema,
})

const activitySchema = z.object({
  at: z.string(),
  nodeId: z.string().nullable().optional(),
  preview: z.string(),
  kind: z.enum(['inbound', 'outbound', 'provider']),
})

const liveSnapshotSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id: z.string().min(1),
  status: z.enum(['starting', 'awaiting_reply', 'completed', 'error', 'stopped']),
  currentNodeId: z.string().nullable().optional(),
  pendingInput: z.object({ nodeId: z.string(), inputType: z.enum(['text', 'email', 'phone', 'numeric', 'date']) }).nullable().optional(),
  variables: z.record(z.string(), scalarSchema).default({}),
  timeline: z.array(z.unknown()),
  timelineTruncated: z.boolean().default(false),
  activity: z.object({
    latestInbound: activitySchema.nullable(),
    latestOutbound: activitySchema.nullable(),
    latestProvider: activitySchema.nullable(),
  }),
  provider: z.object({ latestStatus: z.string().nullable(), updatedAt: z.string().nullable() }),
  updatedAt: z.string(),
})

export type LiveSnapshot = z.infer<typeof liveSnapshotSchema>
export type LiveProjection = Omit<LiveSnapshot, 'timeline'> & {
  timeline: NormalizedMessage[]
  projectionWarnings: number
}

export type LiveProjectionResult =
  | { success: true; projection: LiveProjection }
  | { success: false; error: string }

function timestamp(value: string): number | null {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapAction(action: { type: 'reply' | 'open_url' | 'display_only'; label: string }) {
  if (action.type === 'reply') return { type: 'reply' as const, label: action.label }
  return { type: 'display_only' as const, label: action.label }
}

function mapMessage(message: z.infer<typeof liveMessageSchema>, sender: 'business' | 'user'): RenderableMessage | null {
  const common = { sender }
  switch (message.type) {
    case 'text': return { type: 'text', ...common, text: message.text }
    case 'image': return { type: 'image', ...common, url: message.url ?? '', ...(message.caption ? { caption: message.caption } : {}) }
    case 'video': return { type: 'video', ...common, url: message.url, ...(message.caption ? { caption: message.caption } : {}) }
    case 'file':
    case 'document': return { type: 'document', ...common, filename: message.filename, url: message.url, ...(message.title ? { title: message.title } : {}), ...(message.description ? { description: message.description } : {}) }
    case 'card': return {
      type: 'rich_card', ...common, image: message.image ?? message.url,
      title: message.title, ...(message.description ? { description: message.description } : {}),
      ...(message.actions ? { actions: message.actions.map(mapAction) } : {}),
    }
    case 'rich_card': return {
      type: 'rich_card', ...common, image: message.image,
      title: message.title, ...(message.description ? { description: message.description } : {}),
      ...(message.actions ? { actions: message.actions.map(mapAction) } : {}),
    }
    case 'carousel': return {
      type: 'carousel', ...common,
      cards: message.cards.map((card) => ({
        id: card.id, image: card.image ?? card.imageUrl, title: card.title,
        ...(card.subtitle ? { subtitle: card.subtitle } : {}),
        ...(card.description ? { description: card.description } : {}),
        ...(card.price ? { price: card.price } : {}),
        ...(card.actions ? { actions: card.actions.map(mapAction) } : {}),
      })),
    }
    case 'suggested_replies': return { type: 'suggested_replies', ...common, options: message.options.map((option) => ({ label: option.label })) }
    case 'suggested_actions': return { type: 'suggested_actions', ...common, actions: message.actions.map(mapAction) }
  }
}

export function projectLiveSnapshot(input: unknown): LiveProjectionResult {
  const parsed = liveSnapshotSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Live snapshot is unavailable.' }

  const seen = new Set<string>()
  let projectionWarnings = 0
  const timeline = parsed.data.timeline
    .slice()
    .sort((a, b) => {
      const aAt = a && typeof a === 'object' && typeof (a as { at?: unknown }).at === 'string' ? (a as { at: string }).at : ''
      const bAt = b && typeof b === 'object' && typeof (b as { at?: unknown }).at === 'string' ? (b as { at: string }).at : ''
      const aOrdinal = a && typeof a === 'object' && typeof (a as { ordinal?: unknown }).ordinal === 'number' ? (a as { ordinal: number }).ordinal : Number.MAX_SAFE_INTEGER
      const bOrdinal = b && typeof b === 'object' && typeof (b as { ordinal?: unknown }).ordinal === 'number' ? (b as { ordinal: number }).ordinal : Number.MAX_SAFE_INTEGER
      const timeA = timestamp(aAt) ?? Number.MAX_SAFE_INTEGER
      const timeB = timestamp(bAt) ?? Number.MAX_SAFE_INTEGER
      return timeA - timeB || aOrdinal - bOrdinal
    })
    .flatMap((rawItem) => {
      const itemResult = liveTimelineItemSchema.safeParse(rawItem)
      if (!itemResult.success) {
        projectionWarnings++
        return []
      }
      const item = itemResult.data
      if (seen.has(item.id)) {
        projectionWarnings++
        return []
      }
      seen.add(item.id)
      const at = timestamp(item.at)
      const message = mapMessage(item.message, item.sender)
      if (at === null || !message) {
        projectionWarnings++
        return []
      }
      const validMessage = messageSchema.safeParse(message)
      if (!validMessage.success) {
        projectionWarnings++
        return []
      }
      return [{ runtimeId: item.id, nodeId: item.nodeId ?? LIVE_UNKNOWN_NODE_ID, timestamp: at, message: validMessage.data as RenderableMessage }]
    })

  return {
    success: true,
    projection: {
      ...parsed.data,
      currentNodeId: parsed.data.currentNodeId ?? null,
      pendingInput: parsed.data.pendingInput ?? null,
      timeline,
      projectionWarnings,
    },
  }
}

export type LivePresenterVariables = VariableMap
