import { useEffect, useRef } from 'react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { useActiveChannel } from '../../app/ChannelContext'
import { MessageRenderer } from '../../messages/MessageRenderer'
import { channelThemes } from '../../channels/theme'
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

  // Real WhatsApp interactive buttons are always part of the one message
  // object that offered them — never a separate message. When the pending
  // actions follow a plain business text message on a channel whose chips
  // render "stacked" (WhatsApp), attach them to that message's own card
  // instead of a separate floating row. RCS suggestion chips genuinely do
  // float as their own pill row below the card in the real UI, so this only
  // ever applies where chipStyle is 'stacked'.
  const lastMessage = history[history.length - 1]
  const canAttachToLastMessage =
    channelThemes[channel].chipStyle === 'stacked' &&
    lastMessage?.message.type === 'text' &&
    (lastMessage.message.sender ?? 'business') === 'business'
  const attachedActions = pendingActions && pendingActions.length > 0 && canAttachToLastMessage ? pendingActions : null
  const floatingActions = pendingActions && pendingActions.length > 0 && !canAttachToLastMessage ? pendingActions : null

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history.length, isTyping, pendingActions])

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-3 py-3 flex flex-col gap-2.5">
      {history.length === 0 && !isTyping && (
        <p className="text-center text-[12px] text-slate-400 mt-6">Starting conversation…</p>
      )}
      {history.map((message, i) => (
        <MessageRenderer
          key={message.runtimeId}
          message={message}
          channel={channel}
          trailingActions={
            attachedActions && i === history.length - 1
              ? { choices: attachedActions, onSelect: handleChoice }
              : undefined
          }
        />
      ))}
      {isTyping && <TypingIndicator channel={channel} />}
      {floatingActions && (
        // Real RCS suggestion chips float as their own pill row below the
        // card, so this branch stays for channels where chips aren't
        // "stacked" (see canAttachToLastMessage above).
        <div className="flex w-full justify-start pl-1">
          <ChoiceChips
            choices={floatingActions}
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
