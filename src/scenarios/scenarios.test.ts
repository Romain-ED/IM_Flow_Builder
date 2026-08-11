import { describe, it, expect } from 'vitest'
import { BUILT_IN_SCENARIOS } from './index'
import { parseFlowSource } from '../utils/flowSource'
import { validateFlow } from '../engine/flowValidator'

describe('built-in scenarios', () => {
  for (const scenario of BUILT_IN_SCENARIOS) {
    it(`${scenario.id} parses and validates with no errors`, () => {
      const parsed = parseFlowSource(scenario.source, 'yaml')
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      const result = validateFlow(parsed.data)
      if (!result.success) {
        throw new Error(`${scenario.id} failed validation:\n${result.errors.map((e) => e.message).join('\n')}`)
      }
      expect(result.success).toBe(true)
    })
  }
})
