import { create } from 'zustand'
import {
  brandDefinitionSchema,
  channelIdSchema,
  editableBrandOverrideSchema,
  type BrandDefinition,
  type ChannelId,
  type EditableBrandOverride,
  type FlowDefinition,
} from '../schema/flow'
import { DEFAULT_PHONE_PLATFORM, phonePlatformSchema, type PhonePlatform } from '../schema/platform'
import type { Action, BoardingPassAction, Choice, ListRow, VariableMap } from '../schema/messages'
import {
  computeNodePlan,
  findNode,
  resolveAction,
  resolveBoardingPassAction,
  resolveChoice,
  resolveFreeText,
  resolveInputSubmission,
  resolveListRow,
} from '../engine/ConversationEngine'
import { matchTrigger } from '../engine/triggerMatcher'
import type { InteractionResult, NodeOutcome, NormalizedMessage } from '../engine/types'
import { diffVariableEvents, type ConversationEvent } from '../engine/eventStore'
import type { FlowValidationResult } from '../engine/flowValidator'
import { validateFlowWithChannelCompliance as validateFlow } from '../channels/validateChannelCompliance'
import { parseFlowSource, type FlowSourceFormat } from '../utils/flowSource'
import { sleep } from '../utils/sleep'
import { createId } from '../utils/id'
import { downloadBoardingPassImage } from '../utils/boardingPassFile'
import { findActiveInput } from '../utils/selectors'
import { projectLiveSnapshot, type LiveProjection } from '../live/liveSessionProjection'
import { hasShareHash, readSharedPlatform, readShareHash } from '../utils/shareLink'
import { BUILT_IN_SCENARIOS, DEFAULT_SCENARIO, REMOVED_SCENARIO_IDS } from '../scenarios'
import {
  loadCustomScenarios,
  loadLastScenario,
  loadPreferences,
  lockStorageWrites,
  saveCustomScenarios,
  saveLastScenario,
  savePreferences,
  type CustomScenario,
} from './persistence'

export type { CustomScenario }

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

export function resolveConfiguredBrand(flowBrand: BrandDefinition, override: unknown): BrandDefinition {
  const base = brandDefinitionSchema.safeParse(flowBrand)
  if (!base.success) return flowBrand
  const parsedOverride = editableBrandOverrideSchema.safeParse(override)
  if (!parsedOverride.success) return base.data
  return { ...base.data, ...parsedOverride.data, rcsProfile: base.data.rcsProfile }
}

const EDITABLE_BRAND_KEYS = new Set([
  'name',
  'shortName',
  'avatar',
  'logo',
  'verified',
  'description',
  'website',
  'supportPhone',
  'email',
])

export interface SimulatorState {
  flow: FlowDefinition | null
  flowSource: string
  flowSourceFormat: FlowSourceFormat
  validation: FlowValidationResult | null
  customScenarios: CustomScenario[]
  activeCustomScenarioId: string | null

  channel: ChannelId
  phonePlatform: PhonePlatform
  fastMode: boolean
  presenterMode: boolean
  /**
   * True for the rest of this session once a scenario was loaded from a
   * shared link's URL hash (see `initialize()`/`readShareHash`). Gates
   * `App.tsx` down to just the phone + a Restart button — no Scenarios/
   * Manual pages, no scenario switcher, no brand/variable/channel/debug
   * controls — so a link recipient only ever sees the one scenario the
   * link author shared, never the rest of the tool. Deliberately not a
   * user-togglable preference (unlike `presenterMode`) and never persisted:
   * it's a fact about how this page load started, re-derived from the URL
   * on every `initialize()` rather than remembered across visits.
   */
  sharedLinkMode: boolean
  /**
   * Set when the URL carried a share payload that could not be loaded
   * (malformed, truncated, or not a valid flow). The read-only viewer shows
   * this message instead of any scenario or editor.
   */
  sharedLinkError: string | null
  debugPanelOpen: boolean
  debugWarningsEnabled: boolean
  compareMode: boolean
  /** True while the real device, rather than the browser simulator, owns the next interaction. */
  liveSessionActive: boolean
  /** Credentials for the current live session, held in memory only for phone controls. */
  liveSessionId: string | null
  liveOperatorToken: string
  liveProjection: LiveProjection | null
  liveSyncState: 'idle' | 'fresh' | 'stale' | 'error'
  liveLastSyncedAt: number | null
  liveSyncError: string | null

  configuredVariables: VariableMap
  configuredBrand: BrandDefinition
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

  initialize: () => Promise<void>
  loadFlow: (
    flow: FlowDefinition,
    sourceText: string,
    format: FlowSourceFormat,
    variablesOverride?: VariableMap,
    brandOverride?: unknown,
    customScenarioId?: string,
  ) => void
  loadScenarioSource: (source: string, format?: FlowSourceFormat) => boolean
  loadBuiltInScenario: (id: string) => void

  importCustomScenario: (
    source: string,
    formatHint?: FlowSourceFormat,
    nameOverride?: string,
  ) => { success: boolean; error?: string; id?: string }
  saveCustomScenario: (
    id: string,
    patch: Partial<Pick<CustomScenario, 'name' | 'description' | 'source' | 'format'>>,
  ) => { success: boolean; error?: string }
  deleteCustomScenario: (id: string) => void
  duplicateAsCustomScenario: (source: string, format: FlowSourceFormat, baseName: string) => string
  loadCustomScenario: (id: string) => void

  goToNode: (nodeId: string, hops?: number) => Promise<void>
  restart: () => void
  back: () => void
  jumpToNode: (nodeId: string) => void

  handleChoice: (choice: Choice) => void
  handleListRowSelect: (row: ListRow) => void
  handleAction: (action: Action) => void
  handleInputSubmit: (value: string) => void
  /** The composer's general free-text send — checks global keyword triggers first, then falls back to an active `input` field, then just records the message with no automatic response. */
  handleFreeText: (text: string) => void
  handleBoardingPassAction: (action: BoardingPassAction, message: NormalizedMessage) => void
  handleOtpSubmit: (message: NormalizedMessage, code: string) => void
  /** Shared handler for "Pay now" / "Add to calendar" / "Start" style card buttons: shows a toast, then optionally transitions. */
  simulateCardAction: (toastMessage: string, next?: string, set?: VariableMap) => void

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
  toggleCompareMode: () => void
  setChannel: (channel: ChannelId) => void
  setPhonePlatform: (platform: PhonePlatform) => void
  setStartNodeOverride: (nodeId: string | null) => void
  setLiveSessionActive: (active: boolean) => void
  setLiveSessionCredentials: (sessionId: string | null, operatorToken?: string) => void
  syncLiveSnapshot: (snapshot: unknown) => boolean
  markLiveProjectionStale: (error?: string) => void
  clearLiveProjection: () => void
  restartLiveSession: () => Promise<boolean>
  updateConfiguredVariable: (key: string, value: string | number | boolean) => void
  resetConfiguredVariables: () => void
  updateConfiguredBrand: (patch: Partial<EditableBrandOverride>) => boolean
  resetConfiguredBrand: () => void
}

function persistPrefs(state: SimulatorState) {
  savePreferences({
    channel: state.channel,
    phonePlatform: state.phonePlatform,
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

export const useSimulatorStore = create<SimulatorState>((set, get) => {
  // Decided synchronously from the URL, before the first render, so a share
  // link never flashes (or can reach) the editor while its payload decodes.
  const startedFromShareLink = hasShareHash()
  // Storage-level lock: a read-only viewer can never write to localStorage.
  if (startedFromShareLink) lockStorageWrites()
  // Only true while initialize() loads the shared flow itself.
  let loadingSharedFlow = false
  /** In a read-only shared view every editing/configuration action is a no-op. */
  const isLocked = () => get().sharedLinkMode && !loadingSharedFlow

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
    customScenarios: startedFromShareLink ? [] : loadCustomScenarios(),
    activeCustomScenarioId: null,

    channel: 'rcs',
    phonePlatform: DEFAULT_PHONE_PLATFORM,
    fastMode: false,
    presenterMode: false,
    sharedLinkMode: startedFromShareLink,
    sharedLinkError: null,
    debugPanelOpen: false,
    compareMode: false,
    debugWarningsEnabled: true,
    liveSessionActive: false,
    liveSessionId: null,
    liveOperatorToken: '',
    liveProjection: null,
    liveSyncState: 'idle',
    liveLastSyncedAt: null,
    liveSyncError: null,

    configuredVariables: {},
    configuredBrand: { name: '' },
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

    initialize: async () => {
      if (get().sharedLinkMode) {
        // Read-only share link: never read the visitor's saved preferences,
        // last scenario, or custom scenarios, and never fall back to them.
        const fail = (message: string) =>
          set({ flow: null, validation: null, sharedLinkError: message })
        try {
          const source = await readShareHash()
          const platform = readSharedPlatform()
          if (platform) set({ phonePlatform: platform })
          loadingSharedFlow = true
          try {
            if (!get().loadScenarioSource(source)) {
              const validation = get().validation
              const detail = validation && !validation.success ? validation.errors[0]?.message : undefined
              fail(`The shared flow is not valid${detail ? `: ${detail}` : '.'}`)
            }
          } finally {
            loadingSharedFlow = false
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

    loadBuiltInScenario: (id) => {
      if (get().liveSessionActive || isLocked()) return
      const match = BUILT_IN_SCENARIOS.find((sc) => sc.id === id)
      if (match) get().loadScenarioSource(match.source, 'yaml')
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

    handleChoice: (choice) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      pushSnapshot()
      applyInteractionResult(resolveChoice(choice, s.currentNodeId))
    },

    handleListRowSelect: (row) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      pushSnapshot()
      applyInteractionResult(resolveListRow(row, s.currentNodeId))
    },

    handleAction: (action) => {
      const s = get()
      if (s.liveSessionActive) return
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
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      const activeInput = findActiveInput(s.history, s.currentNodeId)
      if (!activeInput || activeInput.message.type !== 'input') return
      pushSnapshot()
      applyInteractionResult(
        resolveInputSubmission(s.currentNodeId, activeInput.message.variable, activeInput.message.next, value),
      )
    },

    handleFreeText: (text) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId || !text.trim()) return

      // A global keyword trigger wins even over an active structured `input`
      // field — it's meant as an "anytime" escape hatch (e.g. "type CANCEL
      // anytime"), matching how real bots typically implement keyword
      // commands that interrupt whatever the user was doing.
      const trigger = matchTrigger(s.flow.triggers ?? [], text)
      if (!trigger) {
        const activeInput = findActiveInput(s.history, s.currentNodeId)
        if (activeInput && activeInput.message.type === 'input') {
          get().handleInputSubmit(text)
          return
        }
      }

      pushSnapshot()
      applyInteractionResult(resolveFreeText(s.currentNodeId, text, trigger))
    },

    handleOtpSubmit: (message, code) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      if (message.message.type !== 'otp') return
      pushSnapshot()
      applyInteractionResult(
        resolveInputSubmission(s.currentNodeId, message.message.variable, message.message.next, code),
      )
    },

    simulateCardAction: (toastMessage, next, set) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      get().showToast(toastMessage)
      if (next || set) {
        pushSnapshot()
        applyInteractionResult({ setVariables: set, nextNodeId: next })
      }
    },

    handleBoardingPassAction: (action, message) => {
      const s = get()
      if (s.liveSessionActive) return
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
    toggleCompareMode: () => set((s) => s.liveSessionActive || isLocked() ? s : ({ compareMode: !s.compareMode })),
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
    setLiveSessionActive: (active) =>
      set((s) => isLocked() ? s : active
        ? { liveSessionActive: true, playToken: s.playToken + 1, isPlaying: false, isTyping: false, isPaused: false }
        : { liveSessionActive: false, liveSessionId: null, liveOperatorToken: '', liveProjection: null, liveSyncState: 'idle', liveLastSyncedAt: null, liveSyncError: null }),
    setLiveSessionCredentials: (sessionId, operatorToken = '') => set({ liveSessionId: sessionId, liveOperatorToken: operatorToken }),
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
      const { liveSessionId, liveOperatorToken } = get()
      if (!liveSessionId || !liveOperatorToken) return false
      try {
        const response = await fetch(`/api/live/sessions/${liveSessionId}/restart`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${liveOperatorToken}` },
        })
        const body = await response.json().catch(() => ({})) as { error?: string | { message?: string }; liveSnapshot?: unknown }
        if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message ?? `Could not restart the live session (${response.status}).`)
        get().syncLiveSnapshot(body)
        get().showToast('Flow restarted on the test phone')
        return true
      } catch (error) {
        get().markLiveProjectionStale(error instanceof Error ? error.message : 'Could not restart the live session.')
        get().showToast(error instanceof Error ? error.message : 'Could not restart the live session.')
        return false
      }
    },

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
})
