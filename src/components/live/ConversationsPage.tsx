import { Fragment, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Check, Lock, LoaderCircle, MessagesSquare, Pencil, X } from 'lucide-react'
import { ChannelProvider } from '../../app/ChannelContext'
import { channelRenderers } from '../../channels/registry'
import { channelThemes } from '../../channels/theme'
import { computeMessageAttachments } from '../../engine/messageAttachment'
import type { NormalizedMessage } from '../../engine/types'
import { LIVE_UNKNOWN_NODE_ID, projectLiveSnapshot } from '../../live/liveSessionProjection'
import { MessageRenderer } from '../../messages/MessageRenderer'
import { useSimulatorStore } from '../../store/simulatorStore'
import { PhoneFrame } from '../phone/PhoneFrame'

type ConversationSummary = {
  phone: string
  name: string | null
  updatedAt: string
  messageCount: number
  lastMessage: { sender: string; at: string; preview: string } | null
  unmatched: Array<{ id: string; at: string; text: string }>
  sessions: unknown[]
}

const POLL_MS = 5_000
const STORAGE_KEY = 'conversations-password'

async function fetchConversations(password: string): Promise<ConversationSummary[]> {
  const response = await fetch('/api/live/conversations', { headers: { Authorization: `Bearer ${password}` } })
  if (response.status === 401) throw new Error('Incorrect password.')
  if (!response.ok) throw new Error(`Could not load conversations (${response.status}).`)
  return await response.json() as ConversationSummary[]
}

async function saveName(password: string, phone: string, name: string): Promise<string | null> {
  const response = await fetch('/api/live/conversations/name', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
    body: JSON.stringify({ phone, name }),
  })
  if (response.status === 401) throw new Error('Incorrect password.')
  if (!response.ok) throw new Error('Could not save the name.')
  return ((await response.json()) as { name: string | null }).name
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

type ThreadPart = { key: string; startedAt: string; status: string | null; timeline: NormalizedMessage[] }

function threadParts(conversation: ConversationSummary): ThreadPart[] {
  const sessionParts = conversation.sessions.flatMap((snapshot): ThreadPart[] => {
    const result = projectLiveSnapshot(snapshot)
    if (!result.success) return []
    const { projection } = result
    return [{
      key: projection.id,
      startedAt: projection.timeline[0] ? new Date(projection.timeline[0].timestamp).toISOString() : projection.updatedAt,
      status: projection.provider.latestStatus ?? projection.status,
      timeline: projection.timeline,
    }]
  })
  // Messages sent when no session was waiting for them. They have no flow, so they get no session divider.
  const looseParts = (conversation.unmatched ?? []).flatMap((message): ThreadPart[] => {
    const timestamp = Date.parse(message.at)
    if (Number.isNaN(timestamp)) return []
    return [{
      key: `loose-${message.id}`,
      startedAt: message.at,
      status: null,
      timeline: [{ runtimeId: `loose-${message.id}`, nodeId: LIVE_UNKNOWN_NODE_ID, timestamp, message: { type: 'text', sender: 'user', text: message.text } }],
    }]
  })
  return [...sessionParts, ...looseParts].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

function PasswordGate({ onSubmit, error, loading }: { onSubmit: (password: string) => void; error: string | null; loading: boolean }) {
  const [value, setValue] = useState('')
  return (
    <main className="flex-1 min-h-0 flex items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={(event) => { event.preventDefault(); onSubmit(value) }}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3"
      >
        <div className="flex items-center gap-2 text-indigo-700">
          <Lock size={18} />
          <h2 className="text-base font-semibold text-slate-900 m-0">Conversations</h2>
        </div>
        <p className="text-[12.5px] text-slate-600 m-0">Enter the password to view customer conversations.</p>
        <input
          type="password"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={!value || loading} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          {loading && <LoaderCircle size={14} className="animate-spin" />} Unlock
        </button>
      </form>
    </main>
  )
}

function NameEditor({ conversation, onSave }: { conversation: ConversationSummary; onSave: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      await onSave(value)
      setEditing(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the name.')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="m-0 text-[14px] font-semibold text-slate-900 truncate">{conversation.name ?? conversation.phone}</p>
          {conversation.name && <p className="m-0 text-[12px] text-slate-500 font-mono">{conversation.phone}</p>}
        </div>
        <button
          type="button"
          onClick={() => { setValue(conversation.name ?? ''); setError(null); setEditing(true) }}
          aria-label={conversation.name ? 'Edit name' : 'Add name'}
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <Pencil size={14} />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={value}
          maxLength={60}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') setEditing(false) }}
          placeholder="Name (leave empty to remove)"
          aria-label="Contact name"
          className="w-56 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button type="submit" disabled={saving} aria-label="Save name" className="h-7 w-7 flex items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer">
          {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer">
          <X size={14} />
        </button>
      </div>
      <p className="m-0 text-[12px] text-slate-500 font-mono">{conversation.phone}</p>
      {error && <p role="alert" className="m-0 text-[12px] text-rose-700">{error}</p>}
    </form>
  )
}

function Thread({ conversation }: { conversation: ConversationSummary }) {
  const configuredBrand = useSimulatorStore((s) => s.configuredBrand)
  const parts = useMemo(() => threadParts(conversation), [conversation])
  const canAttach = channelThemes.rcs.chipStyle === 'stacked'
  const RcsRenderer = channelRenderers.rcs

  return (
    <div className="phone-viewport h-full w-full">
      <PhoneFrame platform="ios">
        <ChannelProvider channel="rcs">
          <RcsRenderer brand={configuredBrand} onBrandClick={() => {}}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden px-3 py-3 thin-scrollbar">
              {parts.every((part) => part.timeline.length === 0) && (
                <p className="text-center text-[12px] text-slate-400 mt-6">No messages yet.</p>
              )}
              {parts.map((part) => (
                <Fragment key={part.key}>
                  {part.status !== null && part.timeline.length > 0 && (
                    <p className="text-center text-[10.5px] text-slate-400 m-0">
                      Session started {formatTime(part.startedAt)} · {part.status.replaceAll('_', ' ')}
                    </p>
                  )}
                  {computeMessageAttachments(part.timeline, canAttach).map((entry) => (
                    <MessageRenderer key={entry.message.runtimeId} message={entry.message} channel="rcs" readOnly />
                  ))}
                </Fragment>
              ))}
            </div>
          </RcsRenderer>
        </ChannelProvider>
      </PhoneFrame>
    </div>
  )
}

export function ConversationsPage() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? '')
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState('')

  async function unlock(candidate: string) {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchConversations(candidate)
      sessionStorage.setItem(STORAGE_KEY, candidate)
      setPassword(candidate)
      setConversations(next)
      setUnlocked(true)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load conversations.')
    } finally {
      setLoading(false)
    }
  }

  // Re-use a password saved earlier in this browser tab.
  useEffect(() => {
    if (password) void unlock(password)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!unlocked) return
    let cancelled = false
    const timer = window.setInterval(() => {
      fetchConversations(password)
        .then((next) => { if (!cancelled) { setConversations(next); setError(null) } })
        .catch((pollError) => {
          if (cancelled) return
          if (pollError instanceof Error && pollError.message === 'Incorrect password.') {
            sessionStorage.removeItem(STORAGE_KEY)
            setUnlocked(false)
          }
          setError(pollError instanceof Error ? pollError.message : 'Could not refresh conversations.')
        })
    }, POLL_MS)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [unlocked, password])

  useEffect(() => {
    setSelectedId((current) => current && conversations.some((c) => c.phone === current) ? current : conversations[0]?.phone ?? '')
  }, [conversations])

  async function rename(phone: string, name: string) {
    const saved = await saveName(password, phone, name)
    setConversations((current) => current.map((conversation) => conversation.phone === phone ? { ...conversation, name: saved } : conversation))
  }

  if (!unlocked) return <PasswordGate onSubmit={(value) => void unlock(value)} error={error} loading={loading} />

  const selected = conversations.find((c) => c.phone === selectedId) ?? null

  return (
    <main className="flex-1 min-h-0 flex bg-slate-50">
      <aside className="w-[300px] shrink-0 border-r border-slate-200 bg-white flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 text-indigo-700">
          <MessagesSquare size={18} />
          <h2 className="text-[14px] font-semibold text-slate-900 m-0">Conversations</h2>
        </div>
        {error && <p role="alert" className="m-2 rounded-md bg-rose-50 px-2 py-1.5 text-[12px] text-rose-700">{error}</p>}
        <ul className="flex-1 min-h-0 overflow-y-auto list-none p-0 m-0">
          {conversations.length === 0 && <li className="px-4 py-6 text-[12.5px] text-slate-500">No conversations yet. They appear here once a test phone receives a live RCS session.</li>}
          {conversations.map((conversation) => (
            <li key={conversation.phone}>
              <button
                type="button"
                onClick={() => setSelectedId(conversation.phone)}
                aria-current={conversation.phone === selectedId}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${conversation.phone === selectedId ? 'bg-indigo-50' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="text-[13px] font-medium text-slate-900">{conversation.name ?? conversation.phone}</span>
                    {conversation.name && <span className="block text-[11px] text-slate-400 font-mono">{conversation.phone}</span>}
                  </span>
                  <time className="text-[11px] text-slate-400">{formatTime(conversation.updatedAt)}</time>
                </div>
                {conversation.lastMessage && (
                  <p className="m-0 mt-0.5 flex items-center gap-1 text-[12px] text-slate-500 truncate">
                    {conversation.lastMessage.sender === 'user'
                      ? <ArrowDownLeft size={12} className="shrink-0 text-emerald-600" aria-label="Received" />
                      : <ArrowUpRight size={12} className="shrink-0 text-slate-400" aria-label="Sent" />}
                    <span className="truncate">{conversation.lastMessage.preview}</span>
                  </p>
                )}
                <p className="m-0 mt-0.5 text-[11px] text-slate-400">{conversation.messageCount} messages</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="flex-1 min-w-0 flex flex-col min-h-0">
        {selected ? (
          <>
            <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-3">
              <NameEditor key={selected.phone} conversation={selected} onSave={(name) => rename(selected.phone, name)} />
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-6 overflow-y-auto">
              <Thread conversation={selected} />
            </div>
          </>
        ) : <p className="m-auto text-[13px] text-slate-400">Select a conversation.</p>}
      </section>
    </main>
  )
}
