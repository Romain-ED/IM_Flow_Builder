import { useEffect, useState } from 'react'
import { Image as ImageIcon, LoaderCircle, Mic, Plus, RotateCcw, Send, Smile } from 'lucide-react'
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
  const [value, setValue] = useState('')
  const activeInput = findActiveInput(history, currentNodeId)
  const inputMessage = activeInput?.message.type === 'input' ? activeInput.message : null
  const handleFreeText = useSimulatorStore((s) => s.handleFreeText)
  const restartLiveSession = useSimulatorStore((s) => s.restartLiveSession)
  const showToast = useSimulatorStore((s) => s.showToast)
  const liveSessionActive = useSimulatorStore((s) => s.liveSessionActive)
  const [isRestarting, setIsRestarting] = useState(false)
  const theme = channelThemes[channel]

  useEffect(() => setValue(''), [inputMessage?.variable, currentNodeId])

  async function restartLiveFlow() {
    if (isRestarting) return
    setIsRestarting(true)
    await restartLiveSession()
    setIsRestarting(false)
  }

  function submit() {
    if (liveSessionActive || !value.trim()) return
    handleFreeText(value.trim())
    setValue('')
  }

  const ended = pendingOutcome?.kind === 'terminal'
  const errored = pendingOutcome?.kind === 'error'
  const showRcsComposer = channel === 'rcs' && !inputMessage && !liveSessionActive && !ended && !errored

  return (
    <div className={`shrink-0 border-t px-3 py-2.5 ${channel === 'rcs' ? 'border-[#ded4ea] bg-[#f7f2ff]' : 'border-slate-200 bg-white'}`}>
      {liveSessionActive ? (
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 py-1.5 text-center text-[12px] text-indigo-500">Live RCS is active · reply from the test phone</p>
          <button type="button" onClick={() => void restartLiveFlow()} disabled={isRestarting} aria-label="Restart flow on test phone" className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-50">
            {isRestarting ? <LoaderCircle size={12} className="animate-spin" /> : <RotateCcw size={12} />} Restart flow
          </button>
        </div>
      ) : ended ? (
        <p className="m-0 py-1.5 text-center text-[12px] text-slate-400">Conversation ended · use Restart to play again</p>
      ) : errored ? (
        <p className="m-0 py-1.5 text-center text-[12px] text-rose-500">{pendingOutcome && 'message' in pendingOutcome ? pendingOutcome.message : 'Flow error'}</p>
      ) : showRcsComposer ? (
        <form onSubmit={(event) => { event.preventDefault(); submit() }} className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#d6c9e5] bg-white px-1.5 py-1 shadow-sm">
          <button type="button" aria-label="Add attachment" onClick={() => showToast('Attachments are not available in this demo.')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#7350a3] hover:bg-[#f2ebfa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7350a3] cursor-pointer"><Plus size={18} /></button>
          <input type="text" value={value} onChange={(event) => setValue(event.target.value)} placeholder="RCS message" aria-label="RCS message" className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none" />
          <button type="button" aria-label="Choose emoji" onClick={() => showToast('Emoji picker is not available in this demo.')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7350a3] cursor-pointer"><Smile size={17} /></button>
          <button type="button" aria-label="Choose image or media" onClick={() => showToast('Media picker is not available in this demo.')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7350a3] cursor-pointer"><ImageIcon size={17} /></button>
          <button type="submit" aria-label={value.trim() ? 'Send RCS message' : 'Voice message'} disabled={!value.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7350a3] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer">
            {value.trim() ? <Send size={15} /> : <Mic size={16} />}
          </button>
        </form>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); submit() }} className="flex items-center gap-2">
          <input
            type={inputMessage ? INPUT_TYPE_MAP[inputMessage.inputType] : 'text'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={inputMessage?.placeholder ?? 'Type a message'}
            aria-label={inputMessage?.placeholder ?? 'Type a message'}
            className="min-w-0 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{ ['--tw-ring-color' as string]: theme.accent }}
          />
          {value.trim() ? (
            <button type="submit" aria-label={inputMessage?.submitLabel ?? 'Send'} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white" style={{ backgroundColor: theme.accent }}><Send size={15} /></button>
          ) : (
            <button type="button" disabled aria-hidden="true" tabIndex={-1} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300"><Mic size={16} /></button>
          )}
        </form>
      )}
    </div>
  )
}
