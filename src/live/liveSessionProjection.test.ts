import { describe, expect, it } from 'vitest'
import { LIVE_UNKNOWN_NODE_ID, projectLiveSnapshot } from './liveSessionProjection'

const base = {
  schemaVersion: 1,
  id: 'session-1',
  status: 'awaiting_reply',
  currentNodeId: 'welcome',
  pendingInput: null,
  variables: {},
  timelineTruncated: false,
  activity: { latestInbound: null, latestOutbound: null, latestProvider: null },
  provider: { latestStatus: null, updatedAt: null },
  updatedAt: '2026-10-12T22:00:00.000Z',
}

describe('projectLiveSnapshot', () => {
  it('accepts the waiting-for-entry-trigger live status', () => {
    const result = projectLiveSnapshot({ ...base, status: 'awaiting_trigger', currentNodeId: null, timeline: [] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.projection.status).toBe('awaiting_trigger')
  })
  it('maps supported content and keeps stable chronological identity', () => {
    const result = projectLiveSnapshot({
      ...base,
      timeline: [
        { id: 'card', ordinal: 2, at: '2026-10-12T22:00:02.000Z', nodeId: 'welcome', sender: 'business', message: { type: 'card', title: 'Deal', actions: [{ type: 'open_url', label: 'Learn more' }] } },
        { id: 'text', ordinal: 1, at: '2026-10-12T22:00:01.000Z', nodeId: 'welcome', sender: 'user', message: { type: 'text', text: 'Continue' } },
        { id: 'carousel', ordinal: 3, at: '2026-10-12T22:00:03.000Z', nodeId: 'welcome', sender: 'business', message: { type: 'carousel', cards: [{ id: 'one', title: 'One', actions: [{ type: 'reply', label: 'Choose' }] }] } },
        { id: 'text', ordinal: 4, at: '2026-10-12T22:00:04.000Z', nodeId: 'welcome', sender: 'user', message: { type: 'text', text: 'duplicate' } },
      ],
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.projection.timeline.map((item) => item.runtimeId)).toEqual(['text', 'card', 'carousel'])
    expect(result.projection.timeline[1].message).toMatchObject({ type: 'rich_card', actions: [{ type: 'display_only', label: 'Learn more' }] })
    expect(JSON.stringify(result.projection)).not.toContain('open_url')
  })

  it('skips malformed and unsupported items without rejecting the valid snapshot', () => {
    const result = projectLiveSnapshot({
      ...base,
      timeline: [
        { id: 'valid', ordinal: 1, at: '2026-10-12T22:00:00.000Z', sender: 'business', message: { type: 'text', text: 'Hello' } },
        { id: 'bad', ordinal: 2, at: 'not-a-date', sender: 'business', message: { type: 'unknown' } },
        null,
      ],
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.projection.timeline).toHaveLength(1)
    expect(result.projection.timeline[0].nodeId).toBe(LIVE_UNKNOWN_NODE_ID)
    expect(result.projection.projectionWarnings).toBe(2)
  })

  it('rejects an invalid snapshot at the projection boundary', () => {
    expect(projectLiveSnapshot({ ...base, timeline: [], activity: null }).success).toBe(false)
  })
})
