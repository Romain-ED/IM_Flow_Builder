import type { Choice } from '../../schema/messages'
import type { ChannelId } from '../../schema/flow'
import { channelThemes } from '../../channels/theme'

interface ChoiceChipsProps {
  choices: Choice[]
  channel: ChannelId
  interactive: boolean
  onSelect: (choice: Choice) => void
  ariaLabel?: string
}

export function ChoiceChips({ choices, channel, interactive, onSelect, ariaLabel }: ChoiceChipsProps) {
  const theme = channelThemes[channel]
  const isRcs = channel === 'rcs'

  if (theme.chipStyle === 'stacked') {
    return (
      <div className="flex flex-col rounded-lg overflow-hidden border border-slate-200 bg-white" aria-label={ariaLabel}>
        {choices.map((choice, i) => (
          <button
            key={choice.value ?? choice.label ?? i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onSelect(choice)}
            className={`animate-choice-chip px-4 py-2.5 text-[13.5px] font-medium text-center transition-colors ${theme.chipText} ${i > 0 ? 'border-t border-slate-200' : ''} ${interactive ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            style={{ animationDelay: `${120 + i * 45}ms` }}
          >
            {choice.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`${isRcs ? 'w-full justify-end' : ''} flex flex-wrap gap-2`} aria-label={ariaLabel}>
      {choices.map((choice, i) => (
        <button
          key={choice.value ?? choice.label ?? i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onSelect(choice)}
          className={`${isRcs ? 'inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px]' : 'rounded-full px-3.5 py-2 text-[13px] font-medium'} animate-choice-chip transition-colors ${theme.chipBg} ${theme.chipBorder} ${theme.chipText} ${interactive ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
          style={{ animationDelay: `${120 + i * 45}ms` }}
        >
          <span>{choice.label}</span>
        </button>
      ))}
    </div>
  )
}
