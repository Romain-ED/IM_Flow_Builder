import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Env } from './types.js'

export interface ShareStore {
  durable: boolean
  kind: string
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  increment(key: string, by?: number): Promise<number>
  decrement(key: string, by?: number): Promise<number>
}

/**
 * Key/value stores behind the read-only share links (`server/shareLinks.ts`).
 *
 * Contract: async `get(key)` -> string | null, `set(key, string)`,
 * `increment(key, by = 1)` / `decrement(key, by = 1)` -> new integer.
 *
 * Durability:
 * - On Vonage Cloud Runtime the store is the VCR *account* State provider
 *   (Redis-backed, no TTL set). Unlike instance state it is not deleted when an
 *   instance is destroyed, so links survive restarts and redeploys. Instance
 *   state, the container's disk and process memory do NOT survive and are never
 *   used for share links.
 * - Outside VCR the store is opt-in: set SHARE_STORE_PATH to a JSON file for
 *   local development. Without it share links are disabled (503) and the client
 *   falls back to long self-contained links.
 */

/** Subset of the VCR account State API used here. */
interface AccountState {
  get(key: string): Promise<unknown>
  set(key: string, value: string): Promise<unknown>
  increment(key: string, by: number): Promise<unknown>
  decrement(key: string, by: number): Promise<unknown>
}
export const STORE_KEY_PREFIX = 'imfb:share:v1:'

/** True when running on Vonage Cloud Runtime (these variables are injected by the platform). */
export function isVcrRuntime(env: Env): boolean {
  return Boolean(env.VCR_INSTANCE_PUBLIC_URL || env.VCR_REGION || env.SHARE_STORE === 'vcr')
}

/** Account State on VCR. The SDK is imported lazily so local runs never need the platform. */
export function createVcrShareStore(): ShareStore {
  let statePromise: Promise<AccountState> | null = null
  const state = (): Promise<AccountState> => {
    statePromise ??= import('@vonage/vcr-sdk').then(({ vcr }) => vcr.getAccountState() as unknown as AccountState)
    return statePromise
  }
  const k = (key: string) => `${STORE_KEY_PREFIX}${key}`
  return {
    durable: true,
    kind: 'vcr-account-state',
    async get(key: string) {
      const value = await (await state()).get(k(key))
      return typeof value === 'string' ? value : null
    },
    async set(key: string, value: string) {
      await (await state()).set(k(key), value)
    },
    async increment(key: string, by = 1) {
      return Number(await (await state()).increment(k(key), by))
    },
    async decrement(key: string, by = 1) {
      return Number(await (await state()).decrement(k(key), by))
    },
  }
}

/** Local-development JSON file store. Single process only. */
export function createFileShareStore(path: string): ShareStore {
  const file = resolve(path)
  let data: Record<string, string> = {}
  if (existsSync(file)) {
    try {
      data = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      throw new Error(`SHARE_STORE_PATH ${file} is not valid JSON.`)
    }
  }
  const persist = () => {
    mkdirSync(dirname(file), { recursive: true })
    const temporaryPath = `${file}.${process.pid}.tmp`
    writeFileSync(temporaryPath, JSON.stringify(data), { mode: 0o600 })
    renameSync(temporaryPath, file)
  }
  const bump = (key: string, delta: number) => {
    data[key] = String(Number(data[key] ?? 0) + delta)
    persist()
    return Number(data[key])
  }
  return {
    durable: false,
    kind: 'local-file',
    async get(key: string) {
      return Object.hasOwn(data, key) ? (data[key] ?? null) : null
    },
    async set(key: string, value: string) {
      data[key] = value
      persist()
    },
    async increment(key: string, by = 1) {
      return bump(key, by)
    },
    async decrement(key: string, by = 1) {
      return bump(key, -by)
    },
  }
}

/** In-memory store for tests only. Never selected by configuration. */
export function createMemoryShareStore(): ShareStore {
  const data = new Map<string, string>()
  const bump = (key: string, delta: number) => {
    const next = Number(data.get(key) ?? 0) + delta
    data.set(key, String(next))
    return next
  }
  return {
    durable: false,
    kind: 'memory',
    async get(key: string) {
      return data.get(key) ?? null
    },
    async set(key: string, value: string) {
      data.set(key, value)
    },
    async increment(key: string, by = 1) {
      return bump(key, by)
    },
    async decrement(key: string, by = 1) {
      return bump(key, -by)
    },
  }
}

/** Picks the store from the environment, or null (share links disabled) when none is configured. */
export function resolveShareStore(env: Env): ShareStore | null {
  if (isVcrRuntime(env)) return createVcrShareStore()
  if (env.SHARE_STORE_PATH) return createFileShareStore(env.SHARE_STORE_PATH)
  return null
}
