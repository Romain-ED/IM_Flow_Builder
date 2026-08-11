import { useEffect, useRef } from 'react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { MessageRenderer } from '../../messages/MessageRenderer'
import { TypingIndicator } from './TypingIndicator'

export function ConversationView() {
  const channel = useSimulatorStore((s) => s.channel)
  const history = useSimulatorStore((s) => s.history)
  const isTyping = useSimulatorStore((s) => s.isTyping)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history.length, isTyping])

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-3 py-3 flex flex-col gap-2.5">
      {history.length === 0 && !isTyping && (
        <p className="text-center text-[12px] text-slate-400 mt-6">Starting conversation…</p>
      )}
      {history.map((message) => (
        <MessageRenderer key={message.runtimeId} message={message} channel={channel} />
      ))}
      {isTyping && <TypingIndicator channel={channel} />}
    </div>
  )
}
