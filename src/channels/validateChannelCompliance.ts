import type { ChannelId, FlowDefinition } from '../schema/flow'
import { validateFlow, type FlowValidationResult, type ValidationIssue } from '../engine/flowValidator'
import { normalizeForWhatsApp } from './whatsapp/normalize'
import { normalizeForRcs } from './rcs/normalize'

/**
 * Runs each node through the authored channel's real-payload normalizer. A
 * channel-less flow is checked against both channels so it remains portable;
 * a channel-specific flow is checked against the channel it declares. The
 * sidebar can still preview a flow on the other channel and show its soft
 * capability warnings, but that fallback view must not lower the authored
 * channel's official limits.
 *
 * Deliberately lives in `channels/`, not `engine/flowValidator.ts` — this
 * check needs `ChannelCapabilities` (channel-specific real limits), and
 * `engine/` is upstream of `channels/` in this app's layering (see
 * CLAUDE.md's architecture section), so `engine/` may not depend on it.
 * `engine/flowValidator.ts`'s `validateFlow` stays pure structural
 * validation only (duplicate ids, dangling `next` targets, etc.) — this
 * function is deliberately additive, not a replacement.
 */
export function validateChannelCompliance(flow: FlowDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const channels: ChannelId[] = flow.metadata.channel
    ? [flow.metadata.channel]
    : ['whatsapp', 'rcs']

  for (const node of flow.nodes) {
    const messages = node.messages ?? []
    for (const channel of channels) {
      const normalize = channel === 'whatsapp' ? normalizeForWhatsApp : normalizeForRcs
      const result = normalize(messages)
      const label = channel === 'whatsapp' ? 'WhatsApp' : 'RCS'
      for (const message of result.errors) {
        issues.push({ nodeId: node.id, message: `[${label}] Node "${node.id}": ${message}` })
      }
    }
  }
  return issues
}

/**
 * The full validation pipeline: structural validation
 * (`engine/flowValidator.ts`), then — only if that passes — real-payload
 * channel compliance. Channel-specific flows are validated against their
 * declared native channel; channel-less flows are validated against both.
 * Callers that gate scenario loading should use this instead of calling
 * `validateFlow` directly, so structural and authored-channel RCS/WhatsApp
 * violations fail to load rather than silently rendering an invalid payload.
 */
export function validateFlowWithChannelCompliance(raw: unknown): FlowValidationResult {
  const structural = validateFlow(raw)
  if (!structural.success) return structural

  const complianceErrors = validateChannelCompliance(structural.flow)
  if (complianceErrors.length > 0) return { success: false, errors: complianceErrors }

  return structural
}
