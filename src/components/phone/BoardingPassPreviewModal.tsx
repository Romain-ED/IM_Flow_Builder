import { X } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { BoardingPass } from '../../messages/BoardingPass'

export function BoardingPassPreviewModal() {
  const message = useSimulatorStore((s) => s.boardingPassPreview)
  const close = useSimulatorStore((s) => s.closeBoardingPassPreview)
  const channel = useSimulatorStore((s) => s.channel)

  if (!message) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6">
      <button type="button" aria-label="Close boarding pass preview" className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative w-full max-w-[320px] rounded-2xl overflow-hidden shadow-2xl animate-message-in">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
        >
          <X size={15} />
        </button>
        <BoardingPass message={message} channel={channel} interactive={false} compact />
      </div>
    </div>
  )
}
