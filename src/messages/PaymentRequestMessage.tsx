import { Wallet2 } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { MessageShell } from '../components/phone/MessageShell'
import { useSimulatorStore } from '../store/simulatorStore'

interface PaymentRequestMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
  timestampLabel?: string
}

export function PaymentRequestMessage({ message, channel, interactive, timestampLabel }: PaymentRequestMessageProps) {
  const simulateCardAction = useSimulatorStore((s) => s.simulateCardAction)
  if (message.message.type !== 'payment_request') return null
  const { title, description, amount, next, set } = message.message

  return (
    <MessageShell sender="business" channel={channel} chrome="card" timestampLabel={timestampLabel}>
      <div className="p-3.5 flex items-start gap-3">
        <span className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Wallet2 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-slate-900 m-0">{title}</p>
          {description && <p className="text-[12px] text-slate-500 mt-0.5 mb-0">{description}</p>}
        </div>
        <span className="text-[16px] font-bold text-slate-900 shrink-0">{amount}</span>
      </div>
      <button
        type="button"
        disabled={!interactive}
        onClick={() =>
          interactive && simulateCardAction(`Payment simulated — ${amount} charged (demo)`, next, set)
        }
        className={`w-full py-2.5 text-[13.5px] font-semibold border-t border-slate-100 transition-colors ${
          interactive ? 'text-emerald-700 hover:bg-emerald-50 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
        }`}
      >
        Pay now
      </button>
    </MessageShell>
  )
}
