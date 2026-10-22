import { BUILT_IN_SCENARIOS } from './index'
import { normalizeScenarioTrigger } from '../engine/triggerMatcher'
import { flowDefinitionSchema, type FlowDefinition } from '../schema/flow'
import { parseFlowSource } from '../utils/flowSource'
import type { CustomScenario } from '../store/persistence'

export interface TriggerOwner {
  id: string
  name: string
}

function parsedFlow(source: string, format: 'json' | 'yaml'): FlowDefinition | null {
  const parsed = parseFlowSource(source, format)
  if (!parsed.success) return null
  const result = flowDefinitionSchema.safeParse(parsed.data)
  return result.success ? result.data : null
}

/** Returns the existing RCS scenario that owns an exact normalized trigger. */
export function findRcsTriggerConflict(
  flow: FlowDefinition,
  customScenarios: CustomScenario[],
  excludedCustomScenarioId?: string,
): TriggerOwner | null {
  const trigger = flow.metadata.trigger
  if (flow.metadata.channel !== 'rcs' || !trigger?.trim()) return null
  const normalized = normalizeScenarioTrigger(trigger)

  for (const scenario of BUILT_IN_SCENARIOS) {
    const candidate = parsedFlow(scenario.source, 'yaml')
    if (candidate?.metadata.channel === 'rcs' && candidate.metadata.trigger && normalizeScenarioTrigger(candidate.metadata.trigger) === normalized) {
      return { id: scenario.id, name: scenario.name }
    }
  }

  for (const scenario of customScenarios) {
    if (scenario.id === excludedCustomScenarioId) continue
    const candidate = parsedFlow(scenario.source, scenario.format)
    if (candidate?.metadata.channel === 'rcs' && candidate.metadata.trigger && normalizeScenarioTrigger(candidate.metadata.trigger) === normalized) {
      return { id: scenario.id, name: scenario.name }
    }
  }

  return null
}

export function validateBuiltInRcsTriggers(): string[] {
  const errors: string[] = []
  const seen = new Map<string, TriggerOwner>()
  for (const scenario of BUILT_IN_SCENARIOS) {
    const flow = parsedFlow(scenario.source, 'yaml')
    if (!flow || flow.metadata.channel !== 'rcs') continue
    const trigger = flow.metadata.trigger
    if (!trigger?.trim()) {
      errors.push(`${scenario.id}: RCS scenarios require metadata.trigger.`)
      continue
    }
    const normalized = normalizeScenarioTrigger(trigger)
    const previous = seen.get(normalized)
    if (previous) errors.push(`${scenario.id}: trigger conflicts with ${previous.id}.`)
    else seen.set(normalized, { id: scenario.id, name: scenario.name })
  }
  return errors
}
