import type { StateCreator } from 'zustand'
import { projectLiveSnapshot } from '../../live/liveSessionProjection'
import type { SimulatorState } from '../storeTypes'
import type { StoreContext } from '../storeContext'

export const createLiveSlice = (ctx: StoreContext): StateCreator<SimulatorState, [], [], Pick<SimulatorState, 'setLiveSessionActive' | 'setLiveSessionId' | 'syncLiveSnapshot' | 'markLiveProjectionStale' | 'clearLiveProjection' | 'restartLiveSession'>> => (set, get) => {
  const { isLocked } = ctx
  return {
    setLiveSessionActive: (active) =>
      set((s) => isLocked() ? s : active
        ? { liveSessionActive: true, playToken: s.playToken + 1, isPlaying: false, isTyping: false, isPaused: false }
        : { liveSessionActive: false, liveSessionId: null, liveProjection: null, liveSyncState: 'idle', liveLastSyncedAt: null, liveSyncError: null }),
    setLiveSessionId: (sessionId) => set({ liveSessionId: sessionId }),
    syncLiveSnapshot: (snapshot) => {
      const result = projectLiveSnapshot(snapshot)
      if (!result.success) {
        set({ liveSyncState: 'error', liveSyncError: result.error })
        return false
      }
      set({ liveProjection: result.projection, liveSyncState: 'fresh', liveLastSyncedAt: Date.now(), liveSyncError: null })
      return true
    },
    markLiveProjectionStale: (error) => set((s) => ({ liveSyncState: s.liveProjection ? 'stale' : 'error', liveSyncError: error ?? 'Could not refresh the live session.' })),
    clearLiveProjection: () => set({ liveProjection: null, liveSyncState: 'idle', liveLastSyncedAt: null, liveSyncError: null }),
    restartLiveSession: async () => {
      const { liveSessionId } = get()
      if (!liveSessionId) return false
      try {
        const response = await fetch(`/api/live/sessions/${liveSessionId}/restart`, { method: 'POST' })
        const body = await response.json().catch(() => ({})) as { error?: string | { message?: string }; liveSnapshot?: unknown }
        if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message ?? `Could not restart the live session (${response.status}).`)
        get().syncLiveSnapshot(body)
        get().showToast('Flow restarted on the destination phone')
        return true
      } catch (error) {
        get().markLiveProjectionStale(error instanceof Error ? error.message : 'Could not restart the live session.')
        get().showToast(error instanceof Error ? error.message : 'Could not restart the live session.')
        return false
      }
    },

  }
}
