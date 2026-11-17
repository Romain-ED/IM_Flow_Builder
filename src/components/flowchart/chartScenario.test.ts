import { describe, expect, it } from 'vitest'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import { buildChartScenarioOptions, chartScenarioKey, loadChartFlow } from './chartScenario'

describe('buildChartScenarioOptions', () => {
  it('lists built-in scenarios first, then custom ones, with stable keys and badges', () => {
    const options = buildChartScenarioOptions(BUILT_IN_SCENARIOS, [
      { id: 'abc', name: 'Mine', source: 'x', format: 'yaml', createdAt: 1, updatedAt: 2 },
    ])

    expect(options[0]).toMatchObject({
      key: chartScenarioKey('builtin', BUILT_IN_SCENARIOS[0].id),
      name: BUILT_IN_SCENARIOS[0].name,
      badge: 'Built-in',
    })
    expect(options.at(-1)).toEqual({ key: 'custom:abc', name: 'Mine', source: 'x', badge: 'Custom' })
    expect(options).toHaveLength(BUILT_IN_SCENARIOS.length + 1)
  })
})

describe('loadChartFlow', () => {
  it('returns the validated flow for a built-in scenario', () => {
    const result = loadChartFlow(BUILT_IN_SCENARIOS[0].source)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.flow.nodes.length).toBeGreaterThan(0)
  })

  it('returns readable errors for text that is not a valid flow', () => {
    const result = loadChartFlow('version: "1.0"')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0)
  })

  it('reports a start node that does not exist', () => {
    const source = BUILT_IN_SCENARIOS[0].source.replace(/^start:\s*.+$/m, 'start: nowhere')
    const result = loadChartFlow(source)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/nowhere/)
  })

  it('returns a parse error for malformed text without throwing', () => {
    const result = loadChartFlow('{ "nodes": [')
    expect(result.ok).toBe(false)
  })
})
