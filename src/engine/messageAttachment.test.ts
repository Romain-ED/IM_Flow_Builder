import { describe, it, expect } from 'vitest'
import type { NormalizedMessage } from './types'
import { computeMessageAttachments } from './messageAttachment'

let counter = 0
function msg(nodeId: string, message: NormalizedMessage['message']): NormalizedMessage {
  counter += 1
  return { runtimeId: `m${counter}`, nodeId, timestamp: counter, message }
}

const businessText = (nodeId: string, text = 'Hi') => msg(nodeId, { type: 'text', sender: 'business', text })
const userText = (nodeId: string, text = 'Hi') => msg(nodeId, { type: 'text', sender: 'user', text })
const suggestedReplies = (nodeId: string) =>
  msg(nodeId, { type: 'suggested_replies', sender: 'business', options: [{ label: 'Yes' }, { label: 'No' }] })
const suggestedActions = (nodeId: string) =>
  msg(nodeId, {
    type: 'suggested_actions',
    sender: 'business',
    actions: [{ type: 'open_url', label: 'Learn more', url: 'https://x' }],
  })
const document = (nodeId: string) => msg(nodeId, { type: 'document', sender: 'business', filename: 'a.pdf' })

describe('computeMessageAttachments', () => {
  it('merges a business text message with an immediately following suggested_replies in the same node', () => {
    const text = businessText('n1')
    const replies = suggestedReplies('n1')
    const entries = computeMessageAttachments([text, replies], true)
    expect(entries).toEqual([{ message: text, attached: replies }])
  })

  it('merges a business text message with an immediately following suggested_actions in the same node', () => {
    const text = businessText('n1')
    const actions = suggestedActions('n1')
    const entries = computeMessageAttachments([text, actions], true)
    expect(entries).toEqual([{ message: text, attached: actions }])
  })

  it('does not merge across a node boundary', () => {
    const text = businessText('n1')
    const replies = suggestedReplies('n2')
    const entries = computeMessageAttachments([text, replies], true)
    expect(entries).toEqual([{ message: text }, { message: replies }])
  })

  it('does not merge onto a user message', () => {
    const text = userText('n1')
    const replies = suggestedReplies('n1')
    const entries = computeMessageAttachments([text, replies], true)
    expect(entries).toEqual([{ message: text }, { message: replies }])
  })

  it('does not merge onto a non-text message (e.g. document)', () => {
    const doc = document('n1')
    const replies = suggestedReplies('n1')
    const entries = computeMessageAttachments([doc, replies], true)
    expect(entries).toEqual([{ message: doc }, { message: replies }])
  })

  it('leaves a standalone suggested_actions message (no preceding text) unmerged', () => {
    const actions = suggestedActions('n1')
    const entries = computeMessageAttachments([actions], true)
    expect(entries).toEqual([{ message: actions }])
  })

  it('never merges when canAttach is false (RCS keeps chips floating)', () => {
    const text = businessText('n1')
    const replies = suggestedReplies('n1')
    const entries = computeMessageAttachments([text, replies], false)
    expect(entries).toEqual([{ message: text }, { message: replies }])
  })

  it('handles multiple consecutive mergeable pairs without double-consuming messages', () => {
    const t1 = businessText('n1', 'First')
    const r1 = suggestedReplies('n1')
    const t2 = businessText('n2', 'Second')
    const r2 = suggestedActions('n2')
    const entries = computeMessageAttachments([t1, r1, t2, r2], true)
    expect(entries).toEqual([
      { message: t1, attached: r1 },
      { message: t2, attached: r2 },
    ])
  })

  it('preserves an unrelated message in between two mergeable pairs', () => {
    const t1 = businessText('n1', 'First')
    const r1 = suggestedReplies('n1')
    const t2 = businessText('n2', 'Second')
    const entries = computeMessageAttachments([t1, r1, t2], true)
    expect(entries).toEqual([{ message: t1, attached: r1 }, { message: t2 }])
  })
})
