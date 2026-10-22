import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * Key/value stores behind the read-only share links (`server/shareLinks.js`).
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

export const STORE_KEY_PREFIX = 'imfb:share:v1:'

/** True when running on Vonage Cloud Runtime (these variables are injected by the platform). */
export function isVcrRuntime(env) {
  return Boolean(env.VCR_INSTANCE_PUBLIC_URL || env.VCR_REGION || env.SHARE_STORE === 'vcr')
}

/** Account State on VCR. The SDK is imported lazily so local runs never need the platform. */
export function createVcrShareStore() {
  let statePromise = null
  const state = () => {
    statePromise ??= import('@vonage/vcr-sdk').then(({ vcr }) => vcr.getAccountState())
    return statePromise
  }
  const k = (key) => `${STORE_KEY_PREFIX}${key}`
  return {
    durable: true,
    kind: 'vcr-account-state',
    async get(key) {
      const value = await (await state()).get(k(key))
      return typeof value === 'string' ? value : null
    },
    async set(key, value) {
      await (await state()).set(k(key), value)
    },
    async increment(key, by = 1) {
      return Number(await (await state()).increment(k(key), by))
    },
    async decrement(key, by = 1) {
      return Number(await (await state()).decrement(k(key), by))
    },
  }
}

/** Local-development JSON file store. Single process only. */
export function createFileShareStore(path) {
  const file = resolve(path)
  let data = {}
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
  const bump = (key, delta) => {
    data[key] = String(Number(data[key] ?? 0) + delta)
    persist()
    return Number(data[key])
  }
  return {
    durable: false,
    kind: 'local-file',
    async get(key) {
      return Object.hasOwn(data, key) ? data[key] : null
    },
    async set(key, value) {
      data[key] = value
      persist()
    },
    async increment(key, by = 1) {
      return bump(key, by)
    },
    async decrement(key, by = 1) {
      return bump(key, -by)
    },
  }
}

/** In-memory store for tests only. Never selected by configuration. */
export function createMemoryShareStore() {
  const data = new Map()
  const bump = (key, delta) => {
    const next = Number(data.get(key) ?? 0) + delta
    data.set(key, String(next))
    return next
  }
  return {
    durable: false,
    kind: 'memory',
    async get(key) {
      return data.has(key) ? data.get(key) : null
    },
    async set(key, value) {
      data.set(key, value)
    },
    async increment(key, by = 1) {
      return bump(key, by)
    },
    async decrement(key, by = 1) {
      return bump(key, -by)
    },
  }
}

/** Picks the store from the environment, or null (share links disabled) when none is configured. */
export function resolveShareStore(env) {
  if (isVcrRuntime(env)) return createVcrShareStore()
  if (env.SHARE_STORE_PATH) return createFileShareStore(env.SHARE_STORE_PATH)
  return null
}
