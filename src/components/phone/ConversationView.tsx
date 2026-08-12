import { useEffect, useMemo, useRef } from 'react'
import type { NormalizedMessage } from '../../engine/types'
import type { Choice, Action } from '../../schema/messages'
import { computeMessageAttachments } from '../../engine/messageAttachment'
import { useSimulatorStore } from '../../store/simulatorStore'
import { useActiveChannel } from '../../app/ChannelContext'
import { MessageRenderer } from '../../messages/MessageRenderer'
import { channelThemes } from '../../channels/theme'
import { ACTION_ICONS } from '../../utils/actionIcons'
import type { TrailingActionItem } from './MessageShell'
import { TypingIndicator } from './TypingIndicator'
import { ChoiceChips } from './ChoiceChips'

/** Builds the divided-footer button list for a merged suggested_replies/suggested_actions message. */
function trailingItemsForAttached(
  attached: NormalizedMessage,
  handleChoice: (choice: Choice) => void,
  handleAction: (action: Action) => void,
): TrailingActionItem[] {
  if (attached.message.type === 'suggested_replies') {
    return attached.message.options.map((choice, i) => ({
      key: choice.value ?? choice.label ?? String(i),
      label: choice.label,
      onClick: () => handleChoice(choice),
    }))
  }
  if (attached.message.type === 'suggested_actions') {
    return attached.message.actions.map((action, i) => ({
      key: `${action.type}-${i}`,
      label: action.label,
      icon: ACTION_ICONS[action.type],
      onClick: () => handleAction(action),
    }))
  }
  return []
}

export function ConversationView() {
  const channel = useActiveChannel()
  const history = useSimulatorStore((s) => s.history)
  const isTyping = useSimulatorStore((s) => s.isTyping)
  const pendingOutcome = useSimulatorStore((s) => s.pendingOutcome)
  const handleChoice = useSimulatorStore((s) => s.handleChoice)
  const handleAction = useSimulatorStore((s) => s.handleAction)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pendingActions = pendingOutcome?.kind === 'await-actions' ? pendingOutcome.actions : null

  // Real WhatsApp interactive buttons are always part of the one message
  // object that offered them — never a separate message. On channels whose
  // chips render "stacked" (WhatsApp), fold a node's trailing `actions` and
  // any `suggested_replies`/`suggested_actions` message into the business
  // text message they logically follow, instead of a separate floating
  // block. RCS suggestion chips genuinely do float as their own pill row
  // below the card in the real UI, so none of this applies there.
  const canAttach = channelThemes[channel].chipStyle === 'stacked'

  const entries = useMemo(() => computeMessageAttachments(history, canAttach), [history, canAttach])

  const lastEntry = entries[entries.length - 1]
  const canAttachPending =
    canAttach &&
    lastEntry &&
    !lastEntry.attached &&
    lastEntry.message.message.type === 'text' &&
    (lastEntry.message.message.sender ?? 'business') === 'business'
  const floatingActions = pendingActions && pendingActions.length > 0 && !canAttachPending ? pendingActions : null

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history.length, isTyping, pendingActions])

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-3 py-3 flex flex-col gap-2.5">
      {history.length === 0 && !isTyping && (
        <p className="text-center text-[12px] text-slate-400 mt-6">Starting conversation…</p>
      )}
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1
        const trailingItems = entry.attached
          ? trailingItemsForAttached(entry.attached, handleChoice, handleAction)
          : []
        const pendingItems =
          isLast && canAttachPending && pendingActions
            ? pendingActions.map((choice, j) => ({
                key: choice.value ?? choice.label ?? `pending-${j}`,
                label: choice.label,
                onClick: () => handleChoice(choice),
              }))
            : []
        const combined = [...trailingItems, ...pendingItems]
        return (
          <MessageRenderer
            key={entry.message.runtimeId}
            message={entry.message}
            channel={channel}
            trailingActions={combined.length > 0 ? combined : undefined}
          />
        )
      })}
      {isTyping && <TypingIndicator channel={channel} />}
      {floatingActions && (
        // Real RCS suggestion chips float as their own pill row below the
        // card, so this branch stays for channels where chips aren't
        // "stacked" (see canAttach above).
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
