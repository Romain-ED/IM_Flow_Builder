import { create } from 'zustand'
import { DEFAULT_PHONE_PLATFORM } from '../schema/platform'
import { hasShareHash } from '../utils/shareLink'
import { loadCustomScenarios, lockStorageWrites, type CustomScenario } from './persistence'
import type { SimulatorState } from './storeTypes'
import { createStoreContext } from './storeContext'
import { createScenarioSlice } from './slices/scenarioSlice'
import { createPlaybackSlice } from './slices/playbackSlice'
import { createInteractionSlice } from './slices/interactionSlice'
import { createUiSlice } from './slices/uiSlice'
import { createLiveSlice } from './slices/liveSlice'
import { createConfigSlice } from './slices/configSlice'

export type { CustomScenario }
export type { SimulatorState } from './storeTypes'
export { resolveConfiguredBrand } from './storeHelpers'

export const useSimulatorStore = create<SimulatorState>((set, get, api) => {
  // Decided synchronously from the URL, before the first render, so a share
  // link never flashes (or can reach) the editor while its payload decodes.
  const startedFromShareLink = hasShareHash()
  // Storage-level lock: a read-only viewer can never write to localStorage.
  if (startedFromShareLink) lockStorageWrites()
  const ctx = createStoreContext(set, get, startedFromShareLink)

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

    ...createScenarioSlice(ctx)(set, get, api),
    ...createPlaybackSlice(ctx)(set, get, api),
    ...createInteractionSlice(ctx)(set, get, api),
    ...createUiSlice(ctx)(set, get, api),
    ...createLiveSlice(ctx)(set, get, api),
    ...createConfigSlice(ctx)(set, get, api),
  }
})
