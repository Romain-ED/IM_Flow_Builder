import { useEffect, useRef } from 'react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { useActiveChannel } from '../../app/ChannelContext'
import { MessageRenderer } from '../../messages/MessageRenderer'
import { TypingIndicator } from './TypingIndicator'
import { ChoiceChips } from './ChoiceChips'

export function ConversationView() {
  const channel = useActiveChannel()
  const history = useSimulatorStore((s) => s.history)
  const isTyping = useSimulatorStore((s) => s.isTyping)
  const pendingOutcome = useSimulatorStore((s) => s.pendingOutcome)
  const handleChoice = useSimulatorStore((s) => s.handleChoice)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pendingActions = pendingOutcome?.kind === 'await-actions' ? pendingOutcome.actions : null

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history.length, isTyping, pendingActions])

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-3 py-3 flex flex-col gap-2.5">
      {history.length === 0 && !isTyping && (
        <p className="text-center text-[12px] text-slate-400 mt-6">Starting conversation…</p>
      )}
      {history.map((message) => (
        <MessageRenderer key={message.runtimeId} message={message} channel={channel} />
      ))}
      {isTyping && <TypingIndicator channel={channel} />}
      {pendingActions && pendingActions.length > 0 && (
        // Real WhatsApp/RCS interactive buttons are attached to — and scroll
        // with — the message that offered them, not pinned in a floating bar
        // above the composer. This mirrors how a `suggested_replies` message
        // already renders, so a scenario's node-level `actions` (a lighter
        // way to author the same thing) looks identical to one.
        <div className="flex w-full justify-start pl-1">
          <ChoiceChips
            choices={pendingActions}
            channel={channel}
            interactive
            onSelect={handleChoice}
            ariaLabel="Quick replies"
          />
        </div>
      )}
    </div>
  )
}
