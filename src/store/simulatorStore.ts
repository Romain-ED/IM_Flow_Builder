import { create } from 'zustand'
import type { ChannelId, FlowDefinition } from '../schema/flow'
import type { Action, BoardingPassAction, Choice, ListRow, VariableMap } from '../schema/messages'
import {
  computeNodePlan,
  findNode,
  resolveAction,
  resolveBoardingPassAction,
  resolveChoice,
  resolveInputSubmission,
  resolveListRow,
} from '../engine/ConversationEngine'
import type { InteractionResult, NodeOutcome, NormalizedMessage } from '../engine/types'
import { diffVariableEvents, type ConversationEvent } from '../engine/eventStore'
import { validateFlow, type FlowValidationResult } from '../engine/flowValidator'
import { parseFlowSource, type FlowSourceFormat } from '../utils/flowSource'
import { sleep } from '../utils/sleep'
import { createId } from '../utils/id'
import { downloadBoardingPassImage } from '../utils/boardingPassFile'
import { findActiveInput } from '../utils/selectors'
import { BUILT_IN_SCENARIOS, DEFAULT_SCENARIO } from '../scenarios'
import {
  loadLastScenario,
  loadPreferences,
  saveLastScenario,
  savePreferences,
} from './persistence'

interface Snapshot {
  variables: VariableMap
  history: NormalizedMessage[]
  events: ConversationEvent[]
  currentNodeId: string | null
  visitedNodeIds: string[]
  pendingOutcome: NodeOutcome | null
}

const MAX_AUTO_HOPS = 50

function applyFastMode(durationMs: number, fastMode: boolean): number {
  if (!fastMode) return durationMs
  return Math.min(durationMs, 60)
}

export interface SimulatorState {
  flow: FlowDefinition | null
  flowSource: string
  flowSourceFormat: FlowSourceFormat
  validation: FlowValidationResult | null

  channel: ChannelId
  fastMode: boolean
  presenterMode: boolean
  debugPanelOpen: boolean
  debugWarningsEnabled: boolean

  configuredVariables: VariableMap
  variables: VariableMap
  currentNodeId: string | null
  startNodeOverride: string | null
  history: NormalizedMessage[]
  events: ConversationEvent[]
  visitedNodeIds: string[]
  pendingOutcome: NodeOutcome | null
  isTyping: boolean
  isPlaying: boolean
  isPaused: boolean
  snapshots: Snapshot[]
  playToken: number

  toast: { id: string; message: string } | null
  externalActionModal: Action | null
  activeListSheet: NormalizedMessage | null
  boardingPassPreview: NormalizedMessage | null

  initialize: () => void
  loadFlow: (
    flow: FlowDefinition,
    sourceText: string,
    format: FlowSourceFormat,
    variablesOverride?: VariableMap,
  ) => void
  loadScenarioSource: (source: string, format?: FlowSourceFormat) => boolean
  loadBuiltInScenario: (id: string) => void

  goToNode: (nodeId: string, hops?: number) => Promise<void>
  restart: () => void
  back: () => void
  jumpToNode: (nodeId: string) => void

  handleChoice: (choice: Choice) => void
  handleListRowSelect: (row: ListRow) => void
  handleAction: (action: Action) => void
  handleInputSubmit: (value: string) => void
  handleBoardingPassAction: (action: BoardingPassAction, message: NormalizedMessage) => void

  openListSheet: (message: NormalizedMessage) => void
  closeListSheet: () => void
  openBoardingPassPreview: (message: NormalizedMessage) => void
  closeBoardingPassPreview: () => void
  closeExternalActionModal: () => void
  showToast: (message: string) => void
  dismissToast: () => void

  togglePause: () => void
  toggleFastMode: () => void
  togglePresenterMode: () => void
  toggleDebugPanel: () => void
  toggleDebugWarnings: () => void
  setChannel: (channel: ChannelId) => void
  setStartNodeOverride: (nodeId: string | null) => void
  updateConfiguredVariable: (key: string, value: string | number | boolean) => void
  resetConfiguredVariables: () => void
}

function persistPrefs(state: SimulatorState) {
  savePreferences({
    channel: state.channel,
    fastMode: state.fastMode,
    presenterMode: state.presenterMode,
    debugWarningsEnabled: state.debugWarningsEnabled,
  })
}

function persistScenario(state: SimulatorState) {
  if (!state.flow) return
  saveLastScenario({
    source: state.flowSource,
    format: state.flowSourceFormat,
    configuredVariables: state.configuredVariables,
  })
}

export const useSimulatorStore = create<SimulatorState>((set, get) => {
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
    const s = get()
    const nodeId = s.currentNodeId
    if (!nodeId) return

    let history = s.history
    let events = s.events
    let variables = s.variables

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
    flow: null,
    flowSource: '',
    flowSourceFormat: 'yaml',
    validation: null,

    channel: 'rcs',
    fastMode: false,
    presenterMode: false,
    debugPanelOpen: false,
    debugWarningsEnabled: true,

    configuredVariables: {},
    variables: {},
    currentNodeId: null,
    startNodeOverride: null,
    history: [],
    events: [],
    visitedNodeIds: [],
    pendingOutcome: null,
    isTyping: false,
    isPlaying: false,
    isPaused: false,
    snapshots: [],
    playToken: 0,

    toast: null,
    externalActionModal: null,
    activeListSheet: null,
    boardingPassPreview: null,

    initialize: () => {
      const prefs = loadPreferences()
      if (prefs) {
        set((s) => ({
          channel: prefs.channel ?? s.channel,
          fastMode: prefs.fastMode ?? s.fastMode,
          presenterMode: prefs.presenterMode ?? s.presenterMode,
          debugWarningsEnabled: prefs.debugWarningsEnabled ?? s.debugWarningsEnabled,
        }))
      }

      const stored = loadLastScenario()
      const source = stored?.source ?? DEFAULT_SCENARIO.source
      const format = stored?.format ?? 'yaml'
      const parsed = parseFlowSource(source, format)
      if (parsed.success) {
        const validation = validateFlow(parsed.data)
        if (validation.success) {
          get().loadFlow(validation.flow, source, format, stored?.configuredVariables)
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

    loadFlow: (flow, sourceText, format, variablesOverride) => {
      const configuredVariables = variablesOverride ?? { ...(flow.variables ?? {}) }
      set((s) => ({
        flow,
        flowSource: sourceText,
        flowSourceFormat: format,
        validation: { success: true, flow, warnings: [] },
        configuredVariables,
        channel: flow.metadata.channel ?? s.channel,
        startNodeOverride: null,
      }))
      persistScenario(get())
      get().restart()
    },

    loadScenarioSource: (source, formatHint) => {
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

    loadBuiltInScenario: (id) => {
      const match = BUILT_IN_SCENARIOS.find((sc) => sc.id === id)
      if (match) get().loadScenarioSource(match.source, 'yaml')
    },

    goToNode: async (nodeId, hops = 0) => {
      const state = get()
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
      void get().goToNode(s.startNodeOverride ?? s.flow.start)
    },

    back: () => {
      const s = get()
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
      if (!s.flow || !findNode(s.flow, nodeId)) return
      pushSnapshot()
      void get().goToNode(nodeId)
    },

    handleChoice: (choice) => {
      const s = get()
      if (!s.flow || !s.currentNodeId) return
      pushSnapshot()
      applyInteractionResult(resolveChoice(choice, s.currentNodeId))
    },

    handleListRowSelect: (row) => {
      const s = get()
      if (!s.flow || !s.currentNodeId) return
      pushSnapshot()
      applyInteractionResult(resolveListRow(row, s.currentNodeId))
    },

    handleAction: (action) => {
      const s = get()
      if (!s.flow || !s.currentNodeId) return
      if (action.type !== 'reply') {
        set((state) => ({
          events: [...state.events, { type: 'external_action', at: Date.now(), action }],
          externalActionModal: action,
        }))
        return
      }
      pushSnapshot()
      applyInteractionResult(resolveAction(action, s.currentNodeId))
    },

    handleInputSubmit: (value) => {
      const s = get()
      if (!s.flow || !s.currentNodeId) return
      const activeInput = findActiveInput(s.history, s.currentNodeId)
      if (!activeInput || activeInput.message.type !== 'input') return
      pushSnapshot()
      applyInteractionResult(
        resolveInputSubmission(s.currentNodeId, activeInput.message.variable, activeInput.message.next, value),
      )
    },

    handleBoardingPassAction: (action, message) => {
      const s = get()
      if (!s.flow || !s.currentNodeId) return
      if (message.message.type !== 'boarding_pass') return
      const bp = message.message

      if (action.type === 'download') {
        void downloadBoardingPassImage({
          passengerName: bp.passengerName,
          airline: bp.airline,
          flightNumber: bp.flightNumber,
          date: bp.date,
          originCode: bp.origin.code,
          originCity: bp.origin.city,
          destinationCode: bp.destination.code,
          destinationCity: bp.destination.city,
          departureTime: bp.departureTime,
          boardingTime: bp.boardingTime,
          gate: bp.gate,
          terminal: bp.terminal,
          seat: bp.seat,
          boardingGroup: bp.boardingGroup,
          bookingReference: bp.bookingReference,
          cabinClass: bp.cabinClass,
        })
        get().showToast('Boarding pass downloaded')
      } else if (action.type === 'add_to_wallet') {
        get().showToast('Added to Wallet (simulated)')
      } else if (action.type === 'view') {
        set({ boardingPassPreview: message })
        return
      }

      const result = resolveBoardingPassAction(action, s.currentNodeId)
      if (result.userMessage || result.setVariables || result.nextNodeId) {
        pushSnapshot()
        applyInteractionResult(result)
      }
    },

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
        const next = { fastMode: !s.fastMode }
        persistPrefs({ ...s, ...next })
        return next
      }),
    togglePresenterMode: () =>
      set((s) => {
        const next = { presenterMode: !s.presenterMode }
        persistPrefs({ ...s, ...next })
        return next
      }),
    toggleDebugPanel: () => set((s) => ({ debugPanelOpen: !s.debugPanelOpen })),
    toggleDebugWarnings: () =>
      set((s) => {
        const next = { debugWarningsEnabled: !s.debugWarningsEnabled }
        persistPrefs({ ...s, ...next })
        return next
      }),
    setChannel: (channel) =>
      set((s) => {
        persistPrefs({ ...s, channel })
        return { channel }
      }),
    setStartNodeOverride: (nodeId) => set({ startNodeOverride: nodeId }),

    updateConfiguredVariable: (key, value) => {
      set((s) => ({ configuredVariables: { ...s.configuredVariables, [key]: value } }))
      persistScenario(get())
    },
    resetConfiguredVariables: () => {
      const s = get()
      if (!s.flow) return
      set({ configuredVariables: { ...(s.flow.variables ?? {}) } })
      persistScenario(get())
    },
  }
})
