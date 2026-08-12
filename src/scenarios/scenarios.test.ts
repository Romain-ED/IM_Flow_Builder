import { describe, it, expect } from 'vitest'
import { BUILT_IN_SCENARIOS } from './index'
import { parseFlowSource } from '../utils/flowSource'
import { validateFlowWithChannelCompliance } from '../channels/validateChannelCompliance'

describe('built-in scenarios', () => {
  for (const scenario of BUILT_IN_SCENARIOS) {
    it(`${scenario.id} parses, validates, and is compliant on both channels`, () => {
      const parsed = parseFlowSource(scenario.source, 'yaml')
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      const result = validateFlowWithChannelCompliance(parsed.data)
      if (!result.success) {
        throw new Error(`${scenario.id} failed validation:\n${result.errors.map((e) => e.message).join('\n')}`)
      }
      expect(result.success).toBe(true)
    })
  }
})
