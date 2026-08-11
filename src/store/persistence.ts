import type { ChannelId } from '../schema/flow'
import type { VariableMap } from '../schema/messages'
import type { FlowSourceFormat } from '../utils/flowSource'

const PREFERENCES_KEY = 'bmfs.preferences.v1'
const SCENARIO_KEY = 'bmfs.lastScenario.v1'

export interface StoredPreferences {
  channel: ChannelId
  fastMode: boolean
  presenterMode: boolean
  debugWarningsEnabled: boolean
}

export interface StoredScenario {
  source: string
  format: FlowSourceFormat
  configuredVariables: VariableMap
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
  if (!isBrowser()) return
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
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenario))
  } catch {
    /* ignore */
  }
}
