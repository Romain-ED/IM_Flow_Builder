import type { FlowDefinition } from '../schema/flow'
import { validateFlow, type FlowValidationResult, type ValidationIssue } from '../engine/flowValidator'
import { normalizeForWhatsApp } from './whatsapp/normalize'
import { normalizeForRcs } from './rcs/normalize'

/**
 * Runs every node's messages through both channels' real-payload-shape
 * normalizers (`whatsapp/normalize.ts`, `rcs/normalize.ts`) and turns any
 * hard error they return into a `ValidationIssue`, prefixed per channel so
 * it's clear which platform the violation is specific to.
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
  for (const node of flow.nodes) {
    const messages = node.messages ?? []
    const whatsapp = normalizeForWhatsApp(messages)
    for (const message of whatsapp.errors) {
      issues.push({ nodeId: node.id, message: `[WhatsApp] Node "${node.id}": ${message}` })
    }
    const rcs = normalizeForRcs(messages)
    for (const message of rcs.errors) {
      issues.push({ nodeId: node.id, message: `[RCS] Node "${node.id}": ${message}` })
    }
  }
  return issues
}

/**
 * The full validation pipeline: structural validation
 * (`engine/flowValidator.ts`), then — only if that passes — real-payload
 * channel compliance. Callers that gate scenario loading (the store,
 * scenario editor/preview modals, `utils/flowSource.ts`) should use this
 * instead of calling `validateFlow` directly, so a flow that's
 * structurally fine but violates a real WhatsApp/RCS limit still fails to
 * load rather than silently rendering something neither platform could
 * actually send.
 */
export function validateFlowWithChannelCompliance(raw: unknown): FlowValidationResult {
  const structural = validateFlow(raw)
  if (!structural.success) return structural

  const complianceErrors = validateChannelCompliance(structural.flow)
  if (complianceErrors.length > 0) return { success: false, errors: complianceErrors }

  return structural
}
