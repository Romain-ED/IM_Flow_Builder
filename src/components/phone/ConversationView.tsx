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
  const liveProjection = useSimulatorStore((s) => s.liveProjection)
  const liveSessionActive = useSimulatorStore((s) => s.liveSessionActive)
  const isTyping = useSimulatorStore((s) => s.isTyping)
  const pendingOutcome = useSimulatorStore((s) => s.pendingOutcome)
  const handleChoice = useSimulatorStore((s) => s.handleChoice)
  const handleAction = useSimulatorStore((s) => s.handleAction)
  const scrollRef = useRef<HTMLDivElement>(null)

  const readOnly = liveSessionActive
  const displayedHistory = useMemo(() => liveSessionActive ? (liveProjection?.timeline ?? []) : history, [history, liveProjection?.timeline, liveSessionActive])
  const pendingActions = !readOnly && pendingOutcome?.kind === 'await-actions' ? pendingOutcome.actions : null
  const canAttach = channelThemes[channel].chipStyle === 'stacked'
  const entries = useMemo(() => computeMessageAttachments(displayedHistory, canAttach), [displayedHistory, canAttach])

  const lastEntry = entries[entries.length - 1]
  const canAttachPending =
    !readOnly &&
    canAttach &&
    lastEntry &&
    !lastEntry.attached &&
    lastEntry.message.message.type === 'text' &&
    (lastEntry.message.message.sender ?? 'business') === 'business'
  const floatingActions = pendingActions && pendingActions.length > 0 && !canAttachPending ? pendingActions : null

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [displayedHistory.length, isTyping, pendingActions])

  return (
    <div ref={scrollRef} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden px-3 py-3 thin-scrollbar">
      {displayedHistory.length === 0 && !isTyping && (
        <p className="text-center text-[12px] text-slate-400 mt-6">
          {readOnly ? (liveProjection ? 'No live conversation messages yet.' : 'Waiting for the live session snapshot…') : 'Starting conversation…'}
        </p>
      )}
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1
        const trailingItems = !readOnly && entry.attached
          ? trailingItemsForAttached(entry.attached, handleChoice, handleAction)
          : []
        const pendingItems =
          !readOnly && isLast && canAttachPending && pendingActions
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
            readOnly={readOnly}
            trailingActions={combined.length > 0 ? combined : undefined}
          />
        )
      })}
      {!readOnly && isTyping && <TypingIndicator channel={channel} />}
      {!readOnly && floatingActions && (
        <div className="flex w-full justify-start pl-1 animate-message-actions">
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
