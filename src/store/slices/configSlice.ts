import type { StateCreator } from 'zustand'
import { editableBrandOverrideSchema } from '../../schema/flow'
import type { SimulatorState } from '../storeTypes'
import type { StoreContext } from '../storeContext'
import { EDITABLE_BRAND_KEYS } from '../storeHelpers'

export const createConfigSlice = (ctx: StoreContext): StateCreator<SimulatorState, [], [], Pick<SimulatorState, 'updateConfiguredVariable' | 'resetConfiguredVariables' | 'updateConfiguredBrand' | 'resetConfiguredBrand'>> => (set, get) => {
  const { isLocked, persistCurrentScenario } = ctx
  return {
    updateConfiguredVariable: (key, value) => {
      if (get().liveSessionActive || isLocked()) return
      set((s) => ({ configuredVariables: { ...s.configuredVariables, [key]: value } }))
      persistCurrentScenario()
    },
    resetConfiguredVariables: () => {
      const s = get()
      if (s.liveSessionActive || isLocked()) return
      if (!s.flow) return
      set({ configuredVariables: { ...(s.flow.variables ?? {}) } })
      persistCurrentScenario()
    },

    updateConfiguredBrand: (patch) => {
      const s = get()
      if (s.liveSessionActive || isLocked() || !s.flow) return false
      if (Object.keys(patch).some((key) => !EDITABLE_BRAND_KEYS.has(key))) {
        s.showToast('This brand field cannot be changed in the editor.')
        return false
      }
      const parsed = editableBrandOverrideSchema.safeParse({ ...s.configuredBrand, ...patch })
      if (!parsed.success) {
        s.showToast('That brand value is not valid.')
        return false
      }
      set({ configuredBrand: { ...s.configuredBrand, ...parsed.data, rcsProfile: s.flow.brand.rcsProfile } })
      persistCurrentScenario()
      return true
    },
    resetConfiguredBrand: () => {
      const s = get()
      if (s.liveSessionActive || isLocked()) return
      if (!s.flow) return
      set({ configuredBrand: { ...s.flow.brand } })
      persistCurrentScenario()
    },
  }
}
