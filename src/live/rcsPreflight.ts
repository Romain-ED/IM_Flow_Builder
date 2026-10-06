import { rcsCapabilities } from '../channels/rcs/capabilities'
import { maxTrailingButtons } from '../channels/capabilities'
import { deepInterpolate } from '../engine/templateRenderer'
import type { FlowDefinition, FlowNode } from '../schema/flow'
import type { Action, Choice, Message, VariableMap } from '../schema/messages'

/**
 * Strict transport preflight for the Live RCS feature. Unlike the visual RCS
 * normalizer, this emits an explicit, provider-neutral transport plan and
 * rejects simulator-only content before a real device can receive it.
 */
export interface LiveRcsIssue {
  nodeId: string
  messageIndex?: number
  message: string
}

export interface LiveRcsReply {
  id: string
  label: string
  next?: string
  set?: VariableMap
}

export interface LiveRcsAction {
  id: string
  label: string
  type: 'reply' | 'open_url'
  next?: string
  set?: VariableMap
  url?: string
}

export interface LiveRcsContent {
  id: string
  nodeId: string
  type: 'text' | 'image' | 'video' | 'file' | 'card' | 'carousel'
  text?: string
  url?: string
  filename?: string
  title?: string
  description?: string
  cards?: Array<{
    id: string
    title: string
    description?: string
    imageUrl?: string
    actions: LiveRcsAction[]
  }>
  actions?: LiveRcsAction[]
  replies?: LiveRcsReply[]
}

export interface LiveRcsInputExpectation {
  id: string
  nodeId: string
  variable: string
  next?: string
}

export interface LiveRcsNodePlan {
  nodeId: string
  content: LiveRcsContent[]
  inputs: LiveRcsInputExpectation[]
}

export interface LiveRcsPreflightResult {
  success: boolean
  errors: LiveRcsIssue[]
  nodes: LiveRcsNodePlan[]
}

export interface LiveRcsPreflightOptions {
  /** Public VCR origin used to turn scenario-relative media into transport URLs. */
  publicBaseUrl?: string
}

const MAX_TEXT_LENGTH = 3000
const MAX_MEDIA_URL_LENGTH = 2000

function issue(errors: LiveRcsIssue[], nodeId: string, message: string, messageIndex?: number) {
  errors.push({ nodeId, messageIndex, message })
}

function messageId(nodeId: string, index: number): string {
  return `${nodeId}:m:${index}`
}

function replyId(nodeId: string, index: number, actionIndex: number): string {
  return `${nodeId}:m:${index}:reply:${actionIndex}`
}

function actionId(nodeId: string, index: number, actionIndex: number): string {
  return `${nodeId}:m:${index}:action:${actionIndex}`
}

function resolvePublicUrl(
  source: string | undefined,
  publicBaseUrl: string | undefined,
  errors: LiveRcsIssue[],
  nodeId: string,
  messageIndex: number,
  label: string,
): string | undefined {
  if (!source) {
    issue(errors, nodeId, `${label} requires a public HTTPS URL for Live RCS.`, messageIndex)
    return undefined
  }

  let url: URL
  try {
    url = new URL(source, publicBaseUrl)
  } catch {
    issue(errors, nodeId, `${label} URL "${source}" is invalid.`, messageIndex)
    return undefined
  }

  const isLocalDev = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (url.protocol !== 'https:' && !isLocalDev) {
    issue(errors, nodeId, `${label} URL must use HTTPS (or localhost during development).`, messageIndex)
    return undefined
  }
  if (url.href.length > MAX_MEDIA_URL_LENGTH) {
    issue(errors, nodeId, `${label} URL exceeds the ${MAX_MEDIA_URL_LENGTH}-character RCS limit.`, messageIndex)
    return undefined
  }
  return url.href
}

function compileAction(
  action: Action,
  nodeId: string,
  messageIndex: number,
  index: number,
  errors: LiveRcsIssue[],
): LiveRcsAction | undefined {
  const id = actionId(nodeId, messageIndex, index)
  if (action.type === 'reply') {
    return { id, label: action.label, type: 'reply', next: action.next, set: action.set }
  }
  if (action.type === 'open_url') {
    const url = resolvePublicUrl(action.url, undefined, errors, nodeId, messageIndex, `Action "${action.label}"`)
    return url ? { id, label: action.label, type: 'open_url', url } : undefined
  }
  issue(
    errors,
    nodeId,
    `Action "${action.label}" of type "${action.type}" has no configured Live RCS mapping. Use "reply" or "open_url".`,
    messageIndex,
  )
  return undefined
}

function compileChoices(choices: Choice[], nodeId: string, messageIndex: number): LiveRcsReply[] {
  return choices.map((choice, index) => ({
    id: replyId(nodeId, messageIndex, index),
    label: choice.label,
    next: choice.next,
    set: choice.set,
  }))
}

function addSuggestions(
  previous: LiveRcsContent | undefined,
  choices: LiveRcsReply[] | undefined,
  actions: LiveRcsAction[] | undefined,
  errors: LiveRcsIssue[],
  nodeId: string,
  messageIndex: number,
) {
  if (!previous) {
    issue(errors, nodeId, 'Suggestions must immediately follow a business text, media, rich card, or carousel message.', messageIndex)
    return
  }
  const count = choices?.length ?? actions?.length ?? 0
  const kind = choices ? 'suggested_replies' : 'suggested_actions'
  const limit = maxTrailingButtons(rcsCapabilities, kind)
  if (count > limit) {
    issue(errors, nodeId, `${kind} has ${count} options; Live RCS allows at most ${limit}.`, messageIndex)
    return
  }
  if (choices) previous.replies = choices
  if (actions) previous.actions = actions
}

function compileNode(
  node: FlowNode,
  variables: VariableMap,
  options: LiveRcsPreflightOptions,
  errors: LiveRcsIssue[],
): LiveRcsNodePlan {
  const effectiveVariables = { ...variables, ...(node.set ?? {}) }
  const content: LiveRcsContent[] = []
  const inputs: LiveRcsInputExpectation[] = []
  const messages = node.messages ?? []

  for (let index = 0; index < messages.length; index++) {
    const authored = messages[index]
    if (authored.type === 'typing' || authored.type === 'delay') continue
    const message = deepInterpolate(authored, effectiveVariables) as Message

    if ('sender' in message && message.sender === 'user') {
      issue(errors, node.id, 'Live RCS flows cannot send an authored user message; wait for an inbound user reply instead.', index)
      continue
    }

    const id = messageId(node.id, index)
    const previous = content.at(-1)
    switch (message.type) {
      case 'text':
        if (message.text.length > MAX_TEXT_LENGTH) {
          issue(errors, node.id, `Text is ${message.text.length} characters; Live RCS allows at most ${MAX_TEXT_LENGTH}.`, index)
        }
        content.push({ id, nodeId: node.id, type: 'text', text: message.text })
        break
      case 'image':
      case 'video': {
        const url = resolvePublicUrl(message.url, options.publicBaseUrl, errors, node.id, index, message.type)
        if (url) content.push({ id, nodeId: node.id, type: message.type, url, text: message.caption })
        break
      }
      case 'document': {
        const url = resolvePublicUrl(message.url, options.publicBaseUrl, errors, node.id, index, 'Document')
        if (url) {
          content.push({
            id,
            nodeId: node.id,
            type: 'file',
            url,
            filename: message.filename,
            title: message.title,
            description: message.description,
          })
        }
        break
      }
      case 'rich_card': {
        const actions = (message.actions ?? [])
          .map((action, actionIndex) => compileAction(action, node.id, index, actionIndex, errors))
          .filter((action): action is LiveRcsAction => Boolean(action))
        const imageUrl = message.image
          ? resolvePublicUrl(message.image, options.publicBaseUrl, errors, node.id, index, 'Rich card image')
          : undefined
        content.push({
          id,
          nodeId: node.id,
          type: 'card',
          title: message.title,
          description: message.description,
          url: imageUrl,
          actions,
        })
        break
      }
      case 'carousel': {
        const cards = message.cards.map((card, cardIndex) => ({
          id: card.id,
          title: card.title,
          description: card.description ?? card.subtitle,
          imageUrl: card.image
            ? resolvePublicUrl(card.image, options.publicBaseUrl, errors, node.id, index, `Carousel card "${card.title}" image`)
            : undefined,
          actions: (card.actions ?? [])
            .map((action, actionIndex) => compileAction(action, node.id, index, cardIndex * 10 + actionIndex, errors))
            .filter((action): action is LiveRcsAction => Boolean(action)),
        }))
        content.push({ id, nodeId: node.id, type: 'carousel', cards })
        break
      }
      case 'suggested_replies':
        addSuggestions(previous, compileChoices(message.options, node.id, index), undefined, errors, node.id, index)
        break
      case 'suggested_actions': {
        const actions = message.actions
          .map((action, actionIndex) => compileAction(action, node.id, index, actionIndex, errors))
          .filter((action): action is LiveRcsAction => Boolean(action))
        addSuggestions(previous, undefined, actions, errors, node.id, index)
        break
      }
      case 'input':
        inputs.push({ id, nodeId: node.id, variable: message.variable, next: message.next })
        break
      default:
        issue(
          errors,
          node.id,
          `Message type "${message.type}" has no native Live RCS mapping. Replace it with text, media/file, rich card, carousel, suggestions, or an input expectation.`,
          index,
        )
    }
  }

  if (node.actions?.length) {
    const replies = compileChoices(node.actions, node.id, messages.length)
    addSuggestions(content.at(-1), replies, undefined, errors, node.id, messages.length)
  }

  return { nodeId: node.id, content, inputs }
}

/**
 * Creates a provider-neutral RCS transport plan. It does not send any data;
 * callers must reject a result with errors before creating a live session.
 */
export function preflightLiveRcsFlow(
  flow: FlowDefinition,
  options: LiveRcsPreflightOptions = {},
): LiveRcsPreflightResult {
  const errors: LiveRcsIssue[] = []
  const nodes = flow.nodes.map((node) => compileNode(node, flow.variables ?? {}, options, errors))
  return { success: errors.length === 0, errors, nodes }
}
