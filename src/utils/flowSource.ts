import { load as loadYaml, dump as dumpYaml } from 'js-yaml'
import { validateFlowWithChannelCompliance as validateFlow } from '../channels/validateChannelCompliance'

export type FlowSourceFormat = 'json' | 'yaml'

/** Detects whether a pasted/imported flow definition is JSON or YAML. */
export function detectFormat(source: string): FlowSourceFormat {
  const trimmed = source.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  return 'yaml'
}

export function detectFormatFromFilename(filename: string): FlowSourceFormat | null {
  if (filename.endsWith('.json')) return 'json'
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'yaml'
  return null
}

export interface ParseResult {
  success: true
  data: unknown
  format: FlowSourceFormat
}
export interface ParseError {
  success: false
  format: FlowSourceFormat
  message: string
}

/** Parses raw text as JSON or YAML, auto-detecting the format. Never throws. */
export function parseFlowSource(source: string, formatHint?: FlowSourceFormat): ParseResult | ParseError {
  const format = formatHint ?? detectFormat(source)
  try {
    const data = format === 'json' ? JSON.parse(source) : loadYaml(source)
    return { success: true, data, format }
  } catch (error) {
    return {
      success: false,
      format,
      message: error instanceof Error ? error.message : 'Failed to parse flow source.',
    }
  }
}

export type FlowSourcePreview =
  | { success: true; nodeCount: number }
  | { success: false; message: string }

/** Lightweight parse+validate for live "is this OK so far?" feedback in editors. */
export function validateFlowSourceForPreview(source: string): FlowSourcePreview {
  if (!source.trim()) return { success: false, message: 'Nothing to validate yet.' }
  const parsed = parseFlowSource(source)
  if (!parsed.success) return { success: false, message: parsed.message }
  const result = validateFlow(parsed.data)
  if (!result.success) return { success: false, message: result.errors[0]?.message ?? 'Invalid flow.' }
  return { success: true, nodeCount: result.flow.nodes.length }
}

export function toJsonString(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

export function toYamlString(data: unknown): string {
  return dumpYaml(data, { lineWidth: 100 })
}
