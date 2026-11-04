import type { StateCreator } from 'zustand'
import { channelIdSchema } from '../../schema/flow'
import { phonePlatformSchema } from '../../schema/platform'
import { validateFlowWithChannelCompliance as validateFlow } from '../../channels/validateChannelCompliance'
import { parseFlowSource } from '../../utils/flowSource'
import { createId } from '../../utils/id'
import { readSharedPlatform, readSharedSource } from '../../utils/shareLink'
import { BUILT_IN_SCENARIOS, DEFAULT_SCENARIO, REMOVED_SCENARIO_IDS } from '../../scenarios'
import { findRcsTriggerConflict } from '../../scenarios/triggerRegistry'
import { loadLastScenario, loadPreferences, saveCustomScenarios, type CustomScenario } from '../persistence'
import type { SimulatorState } from '../storeTypes'
import type { StoreContext } from '../storeContext'
import { resolveConfiguredBrand } from '../storeHelpers'

export const createScenarioSlice = (ctx: StoreContext): StateCreator<SimulatorState, [], [], Pick<SimulatorState, 'initialize' | 'loadFlow' | 'loadScenarioSource' | 'loadBuiltInScenario' | 'importCustomScenario' | 'saveCustomScenario' | 'deleteCustomScenario' | 'duplicateAsCustomScenario' | 'loadCustomScenario'>> => (set, get) => {
  const { isLocked, setLoadingSharedFlow, persistCurrentScenario } = ctx
  return {
    initialize: async () => {
      if (get().sharedLinkMode) {
        // Read-only share link: never read the visitor's saved preferences,
        // last scenario, or custom scenarios, and never fall back to them.
        const fail = (message: string) =>
          set({ flow: null, validation: null, sharedLinkError: message })
        try {
          const source = await readSharedSource()
          const platform = readSharedPlatform()
          if (platform) set({ phonePlatform: platform })
          setLoadingSharedFlow(true)
          try {
            if (!get().loadScenarioSource(source)) {
              const validation = get().validation
              const detail = validation && !validation.success ? validation.errors[0]?.message : undefined
              fail(`The shared flow is not valid${detail ? `: ${detail}` : '.'}`)
            }
          } finally {
            setLoadingSharedFlow(false)
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : ''
          fail(
            reason.startsWith('This shared link')
              ? reason
              : 'This shared link is damaged or incomplete. Ask the sender for a new link.',
          )
        }
        return
      }
      const prefs = loadPreferences()
      if (prefs) {
        // A returning visitor may have a channel persisted from before the
        // Generic channel was removed — validate before applying it so a
        // stale value can't put an invalid ChannelId into state.
        const persistedChannel = channelIdSchema.safeParse(prefs.channel)
        const persistedPhonePlatform = phonePlatformSchema.safeParse(prefs.phonePlatform)
        set((s) => ({
          channel: persistedChannel.success ? persistedChannel.data : s.channel,
          phonePlatform: persistedPhonePlatform.success ? persistedPhonePlatform.data : s.phonePlatform,
          fastMode: prefs.fastMode ?? s.fastMode,
          presenterMode: prefs.presenterMode ?? s.presenterMode,
          debugWarningsEnabled: prefs.debugWarningsEnabled ?? s.debugWarningsEnabled,
        }))
      }


      const stored = loadLastScenario()
      const source = stored?.source ?? DEFAULT_SCENARIO.source
      const format = stored?.format ?? 'yaml'
      const parsed = parseFlowSource(source, format)
      // A flow persisted from a since-removed built-in scenario falls through to the default.
      const storedId = parsed.success ? (parsed.data as { metadata?: { id?: unknown } }).metadata?.id : undefined
      const removedBuiltIn = typeof storedId === 'string' && REMOVED_SCENARIO_IDS.includes(storedId)
      if (parsed.success && !removedBuiltIn) {
        const validation = validateFlow(parsed.data)
        if (validation.success) {
          get().loadFlow(validation.flow, source, format, stored?.configuredVariables, stored?.configuredBrand)
          return
        }
      }
      const fallback = parseFlowSource(DEFAULT_SCENARIO.source, 'yaml')
      if (fallback.success) {
        const validation = validateFlow(fallback.data)
        if (validation.success) {
          get().loadFlow(validation.flow, DEFAULT_SCENARIO.source, 'yaml')
        }
      }
    },

    loadFlow: (flow, sourceText, format, variablesOverride, brandOverride, customScenarioId) => {
      if (get().liveSessionActive || isLocked()) return
      const configuredVariables = variablesOverride ?? { ...(flow.variables ?? {}) }
      const configuredBrand = resolveConfiguredBrand(flow.brand, brandOverride)
      set((s) => ({
        flow,
        flowSource: sourceText,
        flowSourceFormat: format,
        validation: { success: true, flow, warnings: [] },
        configuredVariables,
        configuredBrand,
        activeCustomScenarioId: customScenarioId ?? null,
        channel: flow.metadata.channel ?? s.channel,
        startNodeOverride: null,
      }))
      persistCurrentScenario()
      get().restart()
    },

    loadScenarioSource: (source, formatHint) => {
      if (get().liveSessionActive || isLocked()) return false
      const parsed = parseFlowSource(source, formatHint)
      if (!parsed.success) {
        set({ validation: { success: false, errors: [{ message: parsed.message }] } })
        return false
      }
      const validation = validateFlow(parsed.data)
      set({ validation })
      if (validation.success) {
        get().loadFlow(validation.flow, source, parsed.format)
        return true
      }
      return false
    },

    loadBuiltInScenario: (id, startImmediately = false) => {
      if (get().liveSessionActive || isLocked()) return
      const match = BUILT_IN_SCENARIOS.find((sc) => sc.id === id)
      if (!match) return
      if (!startImmediately) {
        get().loadScenarioSource(match.source, 'yaml')
        return
      }
      const parsed = parseFlowSource(match.source, 'yaml')
      if (!parsed.success) return
      const validation = validateFlow(parsed.data)
      if (!validation.success || validation.flow.metadata.channel !== 'rcs') return
      get().loadFlow(validation.flow, match.source, 'yaml')
      set({ startNodeOverride: validation.flow.start })
      get().restart()
    },

    importCustomScenario: (source, formatHint, nameOverride) => {
      if (isLocked()) return { success: false, error: 'Not available in a shared link.' }
      if (get().liveSessionActive) return { success: false, error: 'Live session is active.' }
      const parsed = parseFlowSource(source, formatHint)
      if (!parsed.success) return { success: false, error: parsed.message }
      const validation = validateFlow(parsed.data)
      if (!validation.success) {
        return { success: false, error: validation.errors[0]?.message ?? 'Invalid flow.' }
      }
      const conflict = findRcsTriggerConflict(validation.flow, get().customScenarios)
      if (conflict) {
        return { success: false, error: `RCS trigger is already used by scenario "${conflict.name}".` }
      }
      const now = Date.now()
      const entry: CustomScenario = {
        id: createId('scenario'),
        name: nameOverride?.trim() || validation.flow.metadata.name || 'Untitled scenario',
        description: validation.flow.metadata.description,
        source,
        format: parsed.format,
        createdAt: now,
        updatedAt: now,
      }
      const customScenarios = [...get().customScenarios, entry]
      set({ customScenarios })
      saveCustomScenarios(customScenarios)
      return { success: true, id: entry.id }
    },

    saveCustomScenario: (id, patch) => {
      if (isLocked()) return { success: false, error: 'Not available in a shared link.' }
      if (get().liveSessionActive) return { success: false, error: 'Live session is active.' }
      const s = get()
      const existing = s.customScenarios.find((sc) => sc.id === id)
      if (!existing) return { success: false, error: 'Scenario not found.' }

      const nextSource = patch.source ?? existing.source
      const nextFormat = patch.format ?? existing.format
      if (patch.source !== undefined) {
        const parsed = parseFlowSource(nextSource, nextFormat)
        if (!parsed.success) return { success: false, error: parsed.message }
        const validation = validateFlow(parsed.data)
        if (!validation.success) {
          return { success: false, error: validation.errors[0]?.message ?? 'Invalid flow.' }
        }
        const conflict = findRcsTriggerConflict(validation.flow, s.customScenarios, id)
        if (conflict) {
          return { success: false, error: `RCS trigger is already used by scenario "${conflict.name}".` }
        }
      }

      const customScenarios = s.customScenarios.map((sc) =>
        sc.id === id ? { ...sc, ...patch, source: nextSource, format: nextFormat, updatedAt: Date.now() } : sc,
      )
      set({ customScenarios })
      saveCustomScenarios(customScenarios)
      return { success: true }
    },

    deleteCustomScenario: (id) => {
      if (get().liveSessionActive || isLocked()) return
      const customScenarios = get().customScenarios.filter((sc) => sc.id !== id)
      set({ customScenarios })
      saveCustomScenarios(customScenarios)
    },

    duplicateAsCustomScenario: (source, format, baseName) => {
      if (get().liveSessionActive || isLocked()) return ''
      const parsed = parseFlowSource(source, format)
      if (!parsed.success) return ''
      const validation = validateFlow(parsed.data)
      if (!validation.success) return ''
      const conflict = findRcsTriggerConflict(validation.flow, get().customScenarios)
      if (conflict) {
        get().showToast(`RCS trigger is already used by scenario "${conflict.name}".`)
        return ''
      }
      const now = Date.now()
      const entry: CustomScenario = {
        id: createId('scenario'),
        name: `Copy of ${baseName}`,
        source,
        format,
        createdAt: now,
        updatedAt: now,
      }
      const customScenarios = [...get().customScenarios, entry]
      set({ customScenarios })
      saveCustomScenarios(customScenarios)
      return entry.id
    },

    loadCustomScenario: (id) => {
      const match = get().customScenarios.find((sc) => sc.id === id)
      if (!match || get().liveSessionActive || isLocked()) return
      const parsed = parseFlowSource(match.source, match.format)
      if (!parsed.success) {
        set({ validation: { success: false, errors: [{ message: parsed.message }] } })
        return
      }
      const validation = validateFlow(parsed.data)
      set({ validation })
      if (validation.success) {
        const conflict = findRcsTriggerConflict(validation.flow, get().customScenarios, match.id)
        if (conflict) {
          set({ validation: { success: false, errors: [{ message: `RCS trigger is already used by scenario "${conflict.name}".` }] } })
          return
        }
        get().loadFlow(
          validation.flow,
          match.source,
          parsed.format,
          match.configuredVariables,
          match.configuredBrand,
          match.id,
        )
      }
    },

  }
}
