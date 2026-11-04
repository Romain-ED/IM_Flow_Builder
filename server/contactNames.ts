import { dirname, join } from 'node:path'
import { createFileShareStore, resolveShareStore, type ShareStore } from './shareStore.js'
import type { Env } from './types.js'

const STORE_KEY = 'contact-names'
export const MAX_CONTACT_NAME_LENGTH = 60
const PHONE_PATTERN = /^\+?\d{5,20}$/

export interface ContactNames {
  all(): Promise<Record<string, string>>
  /** Saves a display name for a phone number. An empty name removes it. */
  set(phone: string, name: string): Promise<Record<string, string>>
}

export function isValidContactPhone(value: unknown): value is string {
  return typeof value === 'string' && PHONE_PATTERN.test(value)
}

export function createContactNames(store: Pick<ShareStore, 'get' | 'set'>): ContactNames {
  const read = async (): Promise<Record<string, string>> => {
    try {
      const parsed: unknown = JSON.parse((await store.get(STORE_KEY)) ?? '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    } catch {
      return {}
    }
  }
  // Serialize writes so two quick saves cannot overwrite each other.
  let queue: Promise<unknown> = Promise.resolve()
  return {
    all: read,
    set(phone, name) {
      const run = queue.then(async () => {
        const names = await read()
        const trimmed = name.trim()
        if (trimmed) names[phone] = trimmed
        else delete names[phone]
        await store.set(STORE_KEY, JSON.stringify(names))
        return names
      })
      queue = run.catch(() => undefined)
      return run
    },
  }
}

/**
 * Names live in the same durable store as share links on Vonage Cloud Runtime.
 * Elsewhere they fall back to a JSON file next to the live session file.
 */
export function resolveContactNames(env: Env, sessionStoragePath: string): ContactNames {
  // Resolved on first use so a bad file cannot stop the server from starting.
  let names: ContactNames | null = null
  const resolve = () => names ??= createContactNames(
    resolveShareStore(env) ?? createFileShareStore(join(dirname(sessionStoragePath), 'contact-names.json')),
  )
  return { all: () => resolve().all(), set: (phone, name) => resolve().set(phone, name) }
}
