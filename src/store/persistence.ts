import type { ChannelId } from '../schema/flow'
import type { PhonePlatform } from '../schema/platform'
import type { VariableMap } from '../schema/messages'
import type { FlowSourceFormat } from '../utils/flowSource'

const PREFERENCES_KEY = 'bmfs.preferences.v1'
const SCENARIO_KEY = 'bmfs.lastScenario.v1'
const CUSTOM_SCENARIOS_KEY = 'bmfs.customScenarios.v1'
const AI_API_KEY_KEY = 'bmfs.aiApiKey.v1'

export interface StoredPreferences {
  channel: ChannelId
  fastMode: boolean
  presenterMode: boolean
  debugWarningsEnabled: boolean
  phonePlatform: PhonePlatform
}

export interface StoredScenario {
  source: string
  format: FlowSourceFormat
  configuredVariables: VariableMap
  /** Runtime-untrusted editable brand data from older/local browser storage. */
  configuredBrand?: unknown
}

/** A user-created or user-imported scenario, saved locally in the browser. */
export interface CustomScenario {
  id: string
  name: string
  description?: string
  source: string
  format: FlowSourceFormat
  /** Per-scenario runtime configuration; optional for older saved scenarios. */
  configuredVariables?: VariableMap
  configuredBrand?: unknown
  createdAt: number
  updatedAt: number
}

/**
 * Read-only share-link viewers must never write to the visitor's (or the
 * owner's) localStorage. Once locked, every `save*`/`clear*` below is a
 * no-op for the rest of the page load — a storage-level guarantee that holds
 * even if some UI or store path were to call a persist helper by mistake.
 */
let writesLocked = false

export function lockStorageWrites(): void {
  writesLocked = true
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadPreferences(): Partial<StoredPreferences> | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY)
    return raw ? (JSON.parse(raw) as Partial<StoredPreferences>) : null
  } catch {
    return null
  }
}

export function savePreferences(preferences: StoredPreferences): void {
  if (writesLocked || !isBrowser()) return
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    /* localStorage unavailable or full — silently ignore, non-critical */
  }
}

export function loadLastScenario(): StoredScenario | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(SCENARIO_KEY)
    return raw ? (JSON.parse(raw) as StoredScenario) : null
  } catch {
    return null
  }
}

export function saveLastScenario(scenario: StoredScenario): void {
  if (writesLocked || !isBrowser()) return
  try {
    window.localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenario))
  } catch {
    /* ignore */
  }
}

export function loadCustomScenarios(): CustomScenario[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_SCENARIOS_KEY)
    return raw ? (JSON.parse(raw) as CustomScenario[]) : []
  } catch {
    return []
  }
}

export function saveCustomScenarios(scenarios: CustomScenario[]): void {
  if (writesLocked || !isBrowser()) return
  try {
    window.localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(scenarios))
  } catch {
    /* ignore */
  }
}

/**
 * The user's own Anthropic API key, for the in-app "Generate with AI"
 * feature — stored only in this browser, read only to send directly to
 * Anthropic's API when the user explicitly clicks Generate. Never sent
 * anywhere else, never bundled into exported/shared scenarios.
 */
export function loadAiApiKey(): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(AI_API_KEY_KEY)
  } catch {
    return null
  }
}

export function saveAiApiKey(key: string): void {
  if (writesLocked || !isBrowser()) return
  try {
    window.localStorage.setItem(AI_API_KEY_KEY, key)
  } catch {
    /* ignore */
  }
}

export function clearAiApiKey(): void {
  if (writesLocked || !isBrowser()) return
  try {
    window.localStorage.removeItem(AI_API_KEY_KEY)
  } catch {
    /* ignore */
  }
}
