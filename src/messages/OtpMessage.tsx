import { useRef, useState, type KeyboardEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { useSimulatorStore } from '../store/simulatorStore'

interface OtpMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

export function OtpMessage({ message, channel, interactive, timestampLabel }: OtpMessageProps) {
  const handleOtpSubmit = useSimulatorStore((s) => s.handleOtpSubmit)
  const length = message.message.type === 'otp' ? (message.message.codeLength ?? 6) : 6
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  if (message.message.type !== 'otp') return null
  const { prompt } = message.message
  const code = digits.join('')
  const complete = digits.every((d) => d !== '')

  function setDigit(index: number, value: string) {
    const char = value.replace(/[^0-9]/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <MessageShell sender="business" channel={channel} chrome="bubble" timestampLabel={timestampLabel}>
      <div className="flex items-center gap-2 text-[13.5px] text-slate-700 mb-2.5">
        <ShieldCheck size={15} className="text-indigo-500 shrink-0" />
        <span>{prompt ?? 'Enter the verification code we sent you.'}</span>
      </div>
      <div className="flex gap-1.5 mb-2.5" role="group" aria-label="Verification code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            disabled={!interactive}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1}`}
            className="h-9 w-8 text-center rounded-md border border-slate-300 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
          />
        ))}
      </div>
      <button
        type="button"
        disabled={!interactive || !complete}
        onClick={() => interactive && complete && handleOtpSubmit(message, code)}
        className="w-full rounded-lg py-2 text-[13px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Verify
      </button>
    </MessageShell>
  )
}
