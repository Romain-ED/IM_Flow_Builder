import { RotateCcw, Undo2, Pause, Play, Eraser } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

export function PlaybackControls() {
  const restart = useSimulatorStore((s) => s.restart)
  const back = useSimulatorStore((s) => s.back)
  const togglePause = useSimulatorStore((s) => s.togglePause)
  const isPaused = useSimulatorStore((s) => s.isPaused)
  const isPlaying = useSimulatorStore((s) => s.isPlaying)
  const snapshotCount = useSimulatorStore((s) => s.snapshots.length)
  const flow = useSimulatorStore((s) => s.flow)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Playback</span>
      <div className="grid grid-cols-2 gap-1.5">
        <ControlButton icon={RotateCcw} label="Restart" onClick={restart} disabled={!flow} primary />
        <ControlButton icon={Undo2} label="Back" onClick={back} disabled={snapshotCount === 0} />
        <ControlButton
          icon={isPaused ? Play : Pause}
          label={isPaused ? 'Resume' : 'Pause'}
          onClick={togglePause}
          disabled={!isPlaying && !isPaused}
        />
        <ControlButton icon={Eraser} label="Clear" onClick={restart} disabled={!flow} />
      </div>
    </div>
  )
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary,
}: {
  icon: typeof RotateCcw
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${
        primary ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
