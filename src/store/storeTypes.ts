import { type BrandDefinition, type ChannelId, type EditableBrandOverride, type FlowDefinition } from '../schema/flow'
import { type PhonePlatform } from '../schema/platform'
import type { Action, BoardingPassAction, Choice, ListRow, VariableMap } from '../schema/messages'
import type { NodeOutcome, NormalizedMessage } from '../engine/types'
import { type ConversationEvent } from '../engine/eventStore'
import type { FlowValidationResult } from '../engine/flowValidator'
import { type FlowSourceFormat } from '../utils/flowSource'
import { type LiveProjection } from '../live/liveSessionProjection'

import { type CustomScenario } from './persistence'


export interface Snapshot {
  variables: VariableMap
  history: NormalizedMessage[]
  events: ConversationEvent[]
  currentNodeId: string | null
  visitedNodeIds: string[]
  pendingOutcome: NodeOutcome | null
}

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
   * shared link's URL hash (see `initialize()`/`readSharedSource`). Gates
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
  loadBuiltInScenario: (id: string, startImmediately?: boolean) => void

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
