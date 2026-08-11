import { useEffect, useState } from 'react'
import { Send, Mic } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { useActiveChannel } from '../../app/ChannelContext'
import { findActiveInput } from '../../utils/selectors'
import { channelThemes } from '../../channels/theme'

const INPUT_TYPE_MAP: Record<string, string> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  numeric: 'number',
  date: 'date',
}

export function Composer() {
  const channel = useActiveChannel()
  const history = useSimulatorStore((s) => s.history)
  const currentNodeId = useSimulatorStore((s) => s.currentNodeId)
  const pendingOutcome = useSimulatorStore((s) => s.pendingOutcome)
  const handleInputSubmit = useSimulatorStore((s) => s.handleInputSubmit)
  const [value, setValue] = useState('')

  const activeInput = findActiveInput(history, currentNodeId)
  const inputMessage = activeInput?.message.type === 'input' ? activeInput.message : null
  const theme = channelThemes[channel]

  useEffect(() => {
    setValue('')
  }, [inputMessage?.variable, currentNodeId])

  function submit() {
    if (!inputMessage || !value.trim()) return
    handleInputSubmit(value.trim())
    setValue('')
  }

  const ended = pendingOutcome?.kind === 'terminal'
  const errored = pendingOutcome?.kind === 'error'

  return (
    <div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5">
      {ended ? (
        <p className="text-center text-[12px] text-slate-400 py-1.5 m-0">Conversation ended · use Restart to play again</p>
      ) : errored ? (
        <p className="text-center text-[12px] text-rose-500 py-1.5 m-0">
          {pendingOutcome && 'message' in pendingOutcome ? pendingOutcome.message : 'Flow error'}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex items-center gap-2"
        >
          <input
            type={inputMessage ? INPUT_TYPE_MAP[inputMessage.inputType] : 'text'}
            value={value}
            disabled={!inputMessage}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputMessage ? (inputMessage.placeholder ?? 'Type a message') : 'Tap a suggestion above'}
            aria-label={inputMessage ? inputMessage.placeholder ?? 'Message input' : 'Message input (disabled)'}
            className="flex-1 min-w-0 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{ ['--tw-ring-color' as string]: theme.accent }}
          />
          {inputMessage && value.trim() ? (
            <button
              type="submit"
              aria-label={inputMessage.submitLabel ?? 'Send'}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white cursor-pointer"
              style={{ backgroundColor: theme.accent }}
            >
              <Send size={15} />
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-hidden="true"
              tabIndex={-1}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-300"
            >
              <Mic size={16} />
            </button>
          )}
        </form>
      )}
    </div>
  )
}
