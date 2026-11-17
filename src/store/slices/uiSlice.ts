import type { StateCreator } from 'zustand'
import { createId } from '../../utils/id'
import type { SimulatorState } from '../storeTypes'
import type { StoreContext } from '../storeContext'
import { persistPrefs } from '../storeHelpers'

export const createUiSlice = (ctx: StoreContext): StateCreator<SimulatorState, [], [], Pick<SimulatorState, 'openListSheet' | 'closeListSheet' | 'openBoardingPassPreview' | 'closeBoardingPassPreview' | 'closeExternalActionModal' | 'showToast' | 'dismissToast' | 'togglePause' | 'toggleFastMode' | 'togglePresenterMode' | 'toggleDebugPanel' | 'toggleDebugWarnings' | 'setChannel' | 'setPhonePlatform' | 'setStartNodeOverride'>> => (set) => {
  const { isLocked } = ctx
  return {
    openListSheet: (message) => set({ activeListSheet: message }),
    closeListSheet: () => set({ activeListSheet: null }),
    openBoardingPassPreview: (message) => set({ boardingPassPreview: message }),
    closeBoardingPassPreview: () => set({ boardingPassPreview: null }),
    closeExternalActionModal: () => set({ externalActionModal: null }),
    showToast: (message) => set({ toast: { id: createId('toast'), message } }),
    dismissToast: () => set({ toast: null }),

    togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
    toggleFastMode: () =>
      set((s) => {
        if (isLocked()) return s
        const next = { fastMode: !s.fastMode }
        persistPrefs({ ...s, ...next })
        return next
      }),
    togglePresenterMode: () =>
      set((s) => {
        if (isLocked()) return s
        const next = { presenterMode: !s.presenterMode }
        persistPrefs({ ...s, ...next })
        return next
      }),
    toggleDebugPanel: () => set((s) => (isLocked() ? s : { debugPanelOpen: !s.debugPanelOpen })),
    toggleDebugWarnings: () =>
      set((s) => {
        if (isLocked()) return s
        const next = { debugWarningsEnabled: !s.debugWarningsEnabled }
        persistPrefs({ ...s, ...next })
        return next
      }),
    setChannel: (channel) =>
      set((s) => {
        if (s.liveSessionActive || isLocked()) return s
        persistPrefs({ ...s, channel })
        return { channel }
      }),
    setPhonePlatform: (phonePlatform) =>
      set((s) => {
        if (s.liveSessionActive) return s
        persistPrefs({ ...s, phonePlatform })
        return { phonePlatform }
      }),
    setStartNodeOverride: (nodeId) => set((s) => s.liveSessionActive || isLocked() ? s : ({ startNodeOverride: nodeId })),
  }
}
