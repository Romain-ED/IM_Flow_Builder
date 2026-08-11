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

  if (theme.chipStyle === 'stacked') {
    return (
      <div className="flex flex-col rounded-lg overflow-hidden border border-slate-200 bg-white" aria-label={ariaLabel}>
        {choices.map((choice, i) => (
          <button
            key={choice.value ?? choice.label ?? i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onSelect(choice)}
            className={`px-4 py-2.5 text-[13.5px] font-medium text-center transition-colors ${theme.chipText} ${i > 0 ? 'border-t border-slate-200' : ''} ${interactive ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label={ariaLabel}>
      {choices.map((choice, i) => (
        <button
          key={choice.value ?? choice.label ?? i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onSelect(choice)}
          className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${theme.chipBg} ${theme.chipBorder} ${theme.chipText} ${interactive ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}
