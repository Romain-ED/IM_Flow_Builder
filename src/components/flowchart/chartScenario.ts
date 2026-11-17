import type { FlowDefinition } from '../../schema/flow'
import type { BuiltInScenario } from '../../scenarios'
import type { CustomScenario } from '../../store/persistence'
import { parseFlowSource } from '../../utils/flowSource'
import { validateFlowWithChannelCompliance } from '../../channels/validateChannelCompliance'

export type ChartScenarioKind = 'builtin' | 'custom'

export interface ChartScenarioOption {
  key: string
  name: string
  source: string
  badge: 'Built-in' | 'Custom'
}

/** Stable key for a scenario in the flow chart picker, e.g. "builtin:ecommerce" or "custom:abc123". */
export function chartScenarioKey(kind: ChartScenarioKind, id: string): string {
  return `${kind}:${id}`
}

export function buildChartScenarioOptions(
  builtIns: readonly BuiltInScenario[],
  customScenarios: readonly CustomScenario[],
): ChartScenarioOption[] {
  return [
    ...builtIns.map((s) => ({
      key: chartScenarioKey('builtin', s.id),
      name: s.name,
      source: s.source,
      badge: 'Built-in' as const,
    })),
    ...customScenarios.map((s) => ({
      key: chartScenarioKey('custom', s.id),
      name: s.name,
      source: s.source,
      badge: 'Custom' as const,
    })),
  ]
}

export type LoadedChartFlow = { ok: true; flow: FlowDefinition } | { ok: false; errors: string[] }

/** Parses and validates scenario text the same way the preview modal does. Never throws. */
export function loadChartFlow(source: string): LoadedChartFlow {
  const parsed = parseFlowSource(source)
  if (!parsed.success) return { ok: false, errors: [parsed.message] }
  const validated = validateFlowWithChannelCompliance(parsed.data)
  if (!validated.success) return { ok: false, errors: validated.errors.map((issue) => issue.message) }
  return { ok: true, flow: validated.flow }
}
