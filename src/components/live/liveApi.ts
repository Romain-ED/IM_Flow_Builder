export type LiveSessionRecord = {
  id: string
  status: string
  recipient: string
  currentNodeId?: string | null
  createdAt?: string
  updatedAt?: string
  eventCount?: number
  outboundCount?: number
}

export type LiveLogs = {
  generatedAt: string
  session: LiveSessionRecord | null
  diagnostics: Array<Record<string, unknown>>
}

export async function liveRequest<T>(path: string): Promise<T> {
  const response = await fetch(path)
  const body = await response.json().catch(() => ({})) as T & { error?: string | { message?: string } }
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message ?? `Live RCS request failed (${response.status}).`)
  return body
}
