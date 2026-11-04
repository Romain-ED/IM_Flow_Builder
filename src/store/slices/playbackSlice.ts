import type { StateCreator } from 'zustand'
import { computeNodePlan, findNode } from '../../engine/ConversationEngine'
import { diffVariableEvents } from '../../engine/eventStore'
import type { SimulatorState } from '../storeTypes'
import type { StoreContext } from '../storeContext'
import { MAX_AUTO_HOPS, applyFastMode } from '../storeHelpers'

export const createPlaybackSlice = (ctx: StoreContext): StateCreator<SimulatorState, [], [], Pick<SimulatorState, 'goToNode' | 'restart' | 'back' | 'jumpToNode'>> => (set, get) => {
  const { isLocked, pushSnapshot, waitWhilePaused, sleepCancelable } = ctx
  return {
    goToNode: async (nodeId, hops = 0) => {
      const state = get()
      if (state.liveSessionActive) return
      if (!state.flow) return
      const token = state.playToken + 1
      set({ playToken: token, isPlaying: true, pendingOutcome: null, isTyping: false })

      const plan = computeNodePlan(state.flow, nodeId, state.variables)

      const prevVariables = get().variables
      let variables = prevVariables
      let events = get().events
      if (plan.setVariables) {
        variables = { ...variables, ...plan.setVariables }
        events = [...events, ...diffVariableEvents(prevVariables, variables, Date.now())]
      }
      if (get().currentNodeId !== nodeId) {
        events = [...events, { type: 'node_transition', at: Date.now(), from: get().currentNodeId ?? '', to: nodeId }]
      }
      set((s) => ({
        variables,
        events,
        currentNodeId: nodeId,
        visitedNodeIds: [...s.visitedNodeIds, nodeId],
      }))

      for (const step of plan.steps) {
        if (get().playToken !== token) return
        const stillActive = await waitWhilePaused(token)
        if (!stillActive) return

        if (step.kind === 'typing') {
          set({ isTyping: true })
          const ok = await sleepCancelable(applyFastMode(step.durationMs, get().fastMode), token)
          if (get().playToken === token) set({ isTyping: false })
          if (!ok) return
        } else if (step.kind === 'wait') {
          const ok = await sleepCancelable(applyFastMode(step.durationMs, get().fastMode), token)
          if (!ok) return
        } else if (step.kind === 'message') {
          if (get().playToken !== token) return
          set((s) => ({
            history: [...s.history, step.message],
            events: [
              ...s.events,
              { type: 'message_rendered', at: Date.now(), nodeId, message: step.message },
            ],
          }))
        }
      }

      if (get().playToken !== token) return

      const outcome = plan.outcome
      switch (outcome.kind) {
        case 'await-actions':
          set({ pendingOutcome: outcome, isPlaying: false })
          break
        case 'auto-transition':
        case 'condition':
          if (hops >= MAX_AUTO_HOPS) {
            set({
              pendingOutcome: {
                kind: 'error',
                message: 'Stopped after too many automatic transitions — check the flow for a cycle.',
              },
              isPlaying: false,
            })
            return
          }
          await get().goToNode(outcome.nextNodeId, hops + 1)
          break
        case 'terminal':
          set((s) => ({
            pendingOutcome: { kind: 'terminal' },
            isPlaying: false,
            events: [...s.events, { type: 'scenario_ended', at: Date.now(), nodeId }],
          }))
          break
        case 'idle':
          set({ pendingOutcome: outcome, isPlaying: false })
          break
        case 'error':
          set({ pendingOutcome: outcome, isPlaying: false })
          break
      }
    },

    restart: () => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow) return
      const token = s.playToken + 1
      set({
        variables: { ...s.configuredVariables },
        history: [],
        events: [{ type: 'scenario_restarted', at: Date.now() }],
        snapshots: [],
        visitedNodeIds: [],
        pendingOutcome: null,
        currentNodeId: null,
        isTyping: false,
        isPlaying: false,
        isPaused: false,
        playToken: token,
        toast: null,
        externalActionModal: null,
        activeListSheet: null,
        boardingPassPreview: null,
      })
      if (s.flow.metadata.channel === 'rcs' && s.flow.metadata.trigger && !s.startNodeOverride) return
      void get().goToNode(s.startNodeOverride ?? s.flow.start)
    },

    back: () => {
      const s = get()
      if (isLocked()) return
      if (s.liveSessionActive) return
      if (s.snapshots.length === 0) return
      const last = s.snapshots[s.snapshots.length - 1]
      set({
        ...last,
        snapshots: s.snapshots.slice(0, -1),
        playToken: s.playToken + 1,
        isPlaying: false,
        isTyping: false,
        activeListSheet: null,
        externalActionModal: null,
      })
    },

    jumpToNode: (nodeId) => {
      const s = get()
      if (isLocked()) return
      if (!s.flow || !findNode(s.flow, nodeId)) return
      pushSnapshot()
      void get().goToNode(nodeId)
    },

  }
}
