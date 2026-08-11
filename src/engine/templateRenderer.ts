import type { VariableMap } from '../schema/messages'

const TEMPLATE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

/**
 * Replaces `{{variableName}}` placeholders with values from `variables`.
 * Deliberately regex-based (no `eval`, no expression language) — the only
 * thing a template can do is substitute a known variable's string value.
 * Missing or null variables resolve to an empty string.
 */
export function renderTemplate(input: string, variables: VariableMap): string {
  return input.replace(TEMPLATE_PATTERN, (_match, key: string) => {
    const value = variables[key]
    if (value === undefined || value === null) return ''
    return String(value)
  })
}

/**
 * Recursively interpolates every string found in a plain JSON-like value
 * (objects/arrays of strings/numbers/booleans), leaving other structures
 * untouched. Used to render a whole message object against the current
 * variable set without hardcoding a field list per message type.
 */
export function deepInterpolate<T>(value: T, variables: VariableMap): T {
  if (typeof value === 'string') {
    return renderTemplate(value, variables) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepInterpolate(item, variables)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      result[key] = deepInterpolate(entryValue, variables)
    }
    return result as T
  }
  return value
}
