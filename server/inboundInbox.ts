import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** An inbound message that did not belong to any live session. Kept so the Conversations page can show it. */
export interface InboxMessage {
  id: string
  from: string
  at: string
  text: string
}

export interface InboundInbox {
  /** Returns false when a message with the same id is already stored. */
  add(message: InboxMessage): boolean
  list(): InboxMessage[]
}

const MAX_MESSAGES = 500

function isInboxMessage(value: unknown): value is InboxMessage {
  const item = value as Partial<InboxMessage> | null
  return Boolean(item) && typeof item?.id === 'string' && typeof item.from === 'string' && typeof item.at === 'string' && typeof item.text === 'string'
}

export function createMemoryInbox(): InboundInbox {
  const messages: InboxMessage[] = []
  return {
    add(message) {
      if (messages.some((existing) => existing.id === message.id)) return false
      messages.push(message)
      if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES)
      return true
    },
    list: () => messages.map((message) => ({ ...message })),
  }
}

/** JSON file store, same durability as the live session file. A corrupt file starts empty. */
export function createFileInbox(path: string): InboundInbox {
  const memory = createMemoryInbox()
  if (existsSync(path)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
      if (Array.isArray(parsed)) for (const item of parsed) if (isInboxMessage(item)) memory.add(item)
    } catch {
      // Start with an empty inbox rather than blocking webhooks.
    }
  }
  return {
    add(message) {
      if (!memory.add(message)) return false
      mkdirSync(dirname(path), { recursive: true })
      const temporaryPath = `${path}.${process.pid}.tmp`
      writeFileSync(temporaryPath, JSON.stringify(memory.list()), { mode: 0o600 })
      renameSync(temporaryPath, path)
      return true
    },
    list: memory.list,
  }
}
