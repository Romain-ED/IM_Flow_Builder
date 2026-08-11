import { RotateCcw, Undo2, Pause, Play, Eraser } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'

type Variant = 'primary' | 'neutral' | 'amber' | 'rose'

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
      <SectionHeading accent={sectionAccents.playback}>Playback</SectionHeading>
      <div className="grid grid-cols-2 gap-1.5">
        <ControlButton icon={RotateCcw} label="Restart" onClick={restart} disabled={!flow} variant="primary" />
        <ControlButton icon={Undo2} label="Back" onClick={back} disabled={snapshotCount === 0} variant="neutral" />
        <ControlButton
          icon={isPaused ? Play : Pause}
          label={isPaused ? 'Resume' : 'Pause'}
          onClick={togglePause}
          disabled={!isPlaying && !isPaused}
          variant="amber"
        />
        <ControlButton icon={Eraser} label="Clear" onClick={restart} disabled={!flow} variant="rose" />
      </div>
    </div>
  )
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  neutral: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
  rose: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant,
}: {
  icon: typeof RotateCcw
  label: string
  onClick: () => void
  disabled?: boolean
  variant: Variant
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${VARIANT_CLASSES[variant]}`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
