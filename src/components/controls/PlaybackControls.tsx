import { RotateCcw, Undo2, Pause, Play, Eraser } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { darkFocusRing, darkSolids, darkTints } from '../../utils/darkChrome'

type Variant = 'primary' | 'neutral' | 'amber' | 'rose'

export function PlaybackControls() {
  const restart = useSimulatorStore((s) => s.restart)
  const back = useSimulatorStore((s) => s.back)
  const togglePause = useSimulatorStore((s) => s.togglePause)
  const isPaused = useSimulatorStore((s) => s.isPaused)
  const isPlaying = useSimulatorStore((s) => s.isPlaying)
  const snapshotCount = useSimulatorStore((s) => s.snapshots.length)
  const flow = useSimulatorStore((s) => s.flow)
  const liveSessionActive = useSimulatorStore((s) => s.liveSessionActive)

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading accent={sectionAccents.playback} tone="dark">Playback</SectionHeading>
      <div className="grid grid-cols-2 gap-1.5">
        <ControlButton icon={RotateCcw} label="Restart" onClick={restart} disabled={!flow || liveSessionActive} variant="primary" />
        <ControlButton icon={Undo2} label="Back" onClick={back} disabled={snapshotCount === 0 || liveSessionActive} variant="neutral" />
        <ControlButton
          icon={isPaused ? Play : Pause}
          label={isPaused ? 'Resume' : 'Pause'}
          onClick={togglePause}
          disabled={liveSessionActive || (!isPlaying && !isPaused)}
          variant="amber"
        />
        <ControlButton icon={Eraser} label="Clear" onClick={restart} disabled={!flow || liveSessionActive} variant="rose" />
      </div>
    </div>
  )
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: darkSolids.indigo,
  neutral: darkTints.slate,
  amber: darkTints.amber,
  rose: darkTints.rose,
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
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${darkFocusRing} ${VARIANT_CLASSES[variant]}`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
