import type { NormalizedMessage } from '../../engine/types'
import type { Action, RenderableMessage } from '../../schema/messages'

export interface RcsPayloadResult {
  messages: unknown[]
  warnings: string[]
}

function suggestion(action: Action) {
  if (action.type === 'reply') return { reply: { text: action.label, postbackData: action.next ?? action.label } }
  if (action.type === 'open_url') return { action: { text: action.label, openUrlAction: { url: action.url } } }
  if (action.type === 'call') return { action: { text: action.label, dialAction: { phoneNumber: action.phoneNumber } } }
  if (action.type === 'location') return { action: { text: action.label, viewLocationAction: { query: action.query ?? action.address ?? '' } } }
  if (action.type === 'calendar') return { action: { text: action.label, createCalendarEventAction: { event: { title: action.title } } } }
  return { action: { text: action.label } }
}

function contentInfo(url: string) {
  return { fileUrl: url, forceRefresh: false }
}

function mapMessage(message: RenderableMessage, warnings: string[]): unknown | null {
  switch (message.type) {
    case 'text':
      return { contentMessage: { text: message.text } }
    case 'image':
      return { contentMessage: { uploadedFile: { fileUrl: message.url, contentInfo: contentInfo(message.url) } } }
    case 'video':
    case 'document':
      return { contentMessage: { uploadedFile: { fileUrl: message.url ?? '', contentInfo: contentInfo(message.url ?? '') } } }
    case 'rich_card':
      return {
        contentMessage: {
          richCard: {
            standaloneCard: {
              cardContent: {
                title: message.title,
                ...(message.description ? { description: message.description } : {}),
                ...(message.image ? { media: { height: message.mediaHeight ?? 'MEDIUM', contentInfo: contentInfo(message.image) } } : {}),
                ...(message.actions ? { suggestions: message.actions.map(suggestion) } : {}),
              },
            },
          },
        },
      }
    case 'carousel':
      return {
        contentMessage: {
          richCard: {
            carouselCard: {
              cardWidth: 'MEDIUM',
              cardContents: message.cards.map((card) => ({
                title: card.title,
                ...(card.description ? { description: card.description } : {}),
                ...(card.image ? { media: { height: message.mediaHeight ?? 'MEDIUM', contentInfo: contentInfo(card.image) } } : {}),
                ...(card.actions ? { suggestions: card.actions.map(suggestion) } : {}),
              })),
            },
          },
        },
      }
    default:
      warnings.push(`The ${message.type} message has no native RCS payload in this preview.`)
      return null
  }
}

function addSuggestions(payload: unknown, suggestions: unknown[]) {
  const content = (payload as { contentMessage?: Record<string, unknown> }).contentMessage
  if (!content) return
  const cardContent = (content.richCard as { standaloneCard?: { cardContent?: Record<string, unknown> } } | undefined)?.standaloneCard?.cardContent
  if (cardContent) cardContent.suggestions = suggestions
  else content.suggestions = suggestions
}

function isAttachable(message: RenderableMessage) {
  return ['text', 'image', 'video', 'document', 'rich_card', 'carousel'].includes(message.type) && (message.sender ?? 'business') === 'business'
}

/** Builds an inspectable RBM-shaped payload from the messages currently shown in the phone. */
export function buildRcsPayload(history: NormalizedMessage[]): RcsPayloadResult {
  const messages: unknown[] = []
  const warnings: string[] = []

  for (let i = 0; i < history.length; i += 1) {
    const entry = history[i]
    const payload = mapMessage(entry.message, warnings)
    if (!payload) continue
    const attached = history[i + 1]
    if (attached && attached.nodeId === entry.nodeId && isAttachable(entry.message) && (attached.message.type === 'suggested_replies' || attached.message.type === 'suggested_actions')) {
      const suggestions = attached.message.type === 'suggested_replies'
        ? attached.message.options.map((option) => ({ reply: { text: option.label, postbackData: option.value ?? option.label } }))
        : attached.message.actions.map(suggestion)
      addSuggestions(payload, suggestions)
      i += 1
    }
    messages.push(payload)
  }

  return { messages, warnings }
}
