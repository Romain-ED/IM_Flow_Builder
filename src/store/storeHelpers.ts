import { brandDefinitionSchema, editableBrandOverrideSchema, type BrandDefinition } from '../schema/flow'
import { saveCustomScenarios, saveLastScenario, savePreferences } from './persistence'
import type { SimulatorState } from './storeTypes'

export const MAX_AUTO_HOPS = 50

export function applyFastMode(durationMs: number, fastMode: boolean): number {
  if (!fastMode) return durationMs
  return Math.min(durationMs, 60)
}

export function resolveConfiguredBrand(flowBrand: BrandDefinition, override: unknown): BrandDefinition {
  const base = brandDefinitionSchema.safeParse(flowBrand)
  if (!base.success) return flowBrand
  const parsedOverride = editableBrandOverrideSchema.safeParse(override)
  if (!parsedOverride.success) return base.data
  return { ...base.data, ...parsedOverride.data, rcsProfile: base.data.rcsProfile }
}

export const EDITABLE_BRAND_KEYS = new Set([
  'name',
  'shortName',
  'avatar',
  'logo',
  'banner',
  'verified',
  'description',
  'website',
  'supportPhone',
  'email',
])

export function persistPrefs(state: SimulatorState) {
  savePreferences({
    channel: state.channel,
    phonePlatform: state.phonePlatform,
    fastMode: state.fastMode,
    presenterMode: state.presenterMode,
    debugWarningsEnabled: state.debugWarningsEnabled,
  })
}

export function persistScenario(state: SimulatorState) {
  if (!state.flow) return
  saveLastScenario({
    source: state.flowSource,
    format: state.flowSourceFormat,
    configuredVariables: state.configuredVariables,
    configuredBrand: state.configuredBrand,
  })
  if (state.activeCustomScenarioId) {
    const customScenarios = state.customScenarios.map((scenario) =>
      scenario.id === state.activeCustomScenarioId
        ? {
            ...scenario,
            configuredVariables: state.configuredVariables,
            configuredBrand: state.configuredBrand,
            updatedAt: Date.now(),
          }
        : scenario,
    )
    saveCustomScenarios(customScenarios)
  }
}
