import type { StoreApi } from 'zustand'
import type { InteractionResult } from '../engine/types'
import { consumeRcsTrailingSuggestions } from '../engine/messageAttachment'
import { diffVariableEvents } from '../engine/eventStore'
import { sleep } from '../utils/sleep'
import type { SimulatorState, Snapshot } from './storeTypes'
import { persistScenario } from './storeHelpers'

/** Helpers shared by the store slices; created once per store, closing over its set/get. */
export interface StoreContext {
  startedFromShareLink: boolean
  /** In a read-only shared view every editing/configuration action is a no-op. */
  isLocked: () => boolean
  /** True only while initialize() loads the shared flow itself. */
  setLoadingSharedFlow: (loading: boolean) => void
  persistCurrentScenario: () => void
  pushSnapshot: () => void
  applyInteractionResult: (result: InteractionResult) => void
  waitWhilePaused: (token: number) => Promise<boolean>
  sleepCancelable: (ms: number, token: number) => Promise<boolean>
}

export function createStoreContext(
  set: StoreApi<SimulatorState>['setState'],
  get: StoreApi<SimulatorState>['getState'],
  startedFromShareLink: boolean,
): StoreContext {
  let loadingSharedFlow = false
  const isLocked = () => get().sharedLinkMode && !loadingSharedFlow
  const setLoadingSharedFlow = (loading: boolean) => {
    loadingSharedFlow = loading
  }

  function persistCurrentScenario() {
    const state = get()
    persistScenario(state)
    if (state.activeCustomScenarioId) {
      set({
        customScenarios: state.customScenarios.map((scenario) =>
          scenario.id === state.activeCustomScenarioId
            ? {
                ...scenario,
                configuredVariables: state.configuredVariables,
                configuredBrand: state.configuredBrand,
                updatedAt: Date.now(),
              }
            : scenario,
        ),
      })
    }
  }

  function pushSnapshot() {
    const s = get()
    const snapshot: Snapshot = {
      variables: s.variables,
      history: s.history,
      events: s.events,
      currentNodeId: s.currentNodeId,
      visitedNodeIds: s.visitedNodeIds,
      pendingOutcome: s.pendingOutcome,
    }
    set({ snapshots: [...s.snapshots, snapshot] })
  }

  function applyInteractionResult(result: InteractionResult) {
    if (get().liveSessionActive) return
    const s = get()
    const nodeId = s.currentNodeId
    if (!nodeId) return

    let history = s.history
    let events = s.events
    let variables = s.variables

    if (s.channel === 'rcs' && result.userMessage) {
      history = consumeRcsTrailingSuggestions(history, nodeId)
    }

    if (result.userMessage) {
      history = [...history, result.userMessage]
      const label =
        result.userMessage.message.type === 'text' ? result.userMessage.message.text : ''
      events = [...events, { type: 'user_action', at: Date.now(), nodeId, label }]
    }
    if (result.setVariables) {
      const nextVariables = { ...variables, ...result.setVariables }
      events = [...events, ...diffVariableEvents(variables, nextVariables, Date.now())]
      variables = nextVariables
    }

    set({ history, events, variables, pendingOutcome: null, activeListSheet: null })

    if (result.externalAction) {
      events = [...get().events, { type: 'external_action', at: Date.now(), action: result.externalAction }]
      set({ events, externalActionModal: result.externalAction })
    }
    if (result.nextNodeId) {
      void get().goToNode(result.nextNodeId)
    }
  }

  async function waitWhilePaused(token: number): Promise<boolean> {
    while (get().isPaused) {
      if (get().playToken !== token) return false
      await sleep(150)
    }
    return get().playToken === token
  }

  async function sleepCancelable(ms: number, token: number): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < ms) {
      if (get().playToken !== token) return false
      await sleep(Math.min(50, ms - (Date.now() - start)))
    }
    return get().playToken === token
  }

  return {
    startedFromShareLink,
    isLocked,
    setLoadingSharedFlow,
    persistCurrentScenario,
    pushSnapshot,
    applyInteractionResult,
    waitWhilePaused,
    sleepCancelable,
  }
}
