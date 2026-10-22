import type { Trigger } from '../schema/flow'

/**
 * Normalizes an RCS scenario-entry trigger without changing exact matching:
 * Unicode NFC, surrounding whitespace removal, and deterministic lowercase.
 * Internal whitespace, punctuation, and every other character stay significant.
 */
export function normalizeScenarioTrigger(value: string): string {
  return value.normalize('NFC').trim().toLowerCase()
}

export function matchesScenarioTrigger(trigger: string, text: string): boolean {
  const normalizedTrigger = normalizeScenarioTrigger(trigger)
  return Boolean(normalizedTrigger) && normalizedTrigger === normalizeScenarioTrigger(text)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * A trigger matches when any of its `keywords` appears as a whole word in
 * the typed text — case-insensitive unless `caseSensitive` is set. Whole-word
 * (not substring) so a keyword like "cat" doesn't fire on "category"; "any
 * word in the sentence" rather than "the whole message equals the keyword"
 * so "I'd like to cancel please" still matches a `cancel` trigger.
 *
 * Checks triggers in authored order and returns the first match — first
 * trigger wins if two keyword lists overlap.
 */
export function matchTrigger(triggers: Trigger[], text: string): Trigger | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  for (const trigger of triggers) {
    for (const keyword of trigger.keywords) {
      const flags = trigger.caseSensitive ? '' : 'i'
      const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, flags)
      if (pattern.test(trimmed)) return trigger
    }
  }
  return null
}
