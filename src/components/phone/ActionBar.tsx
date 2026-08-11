import { useSimulatorStore } from '../../store/simulatorStore'
import { ChoiceChips } from './ChoiceChips'

export function ActionBar() {
  const channel = useSimulatorStore((s) => s.channel)
  const pendingOutcome = useSimulatorStore((s) => s.pendingOutcome)
  const handleChoice = useSimulatorStore((s) => s.handleChoice)

  if (pendingOutcome?.kind !== 'await-actions' || pendingOutcome.actions.length === 0) return null

  return (
    <div className="shrink-0 bg-white/95 backdrop-blur border-t border-slate-100 px-3 py-2 overflow-x-auto no-scrollbar">
      <ChoiceChips
        choices={pendingOutcome.actions}
        channel={channel}
        interactive
        onSelect={handleChoice}
        ariaLabel="Quick replies"
      />
    </div>
  )
}
