import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import type { CarouselCard } from '../schema/messages'
import { ImageWithFallback } from '../components/common/ImageWithFallback'
import { ActionButton } from '../components/phone/ActionButton'
import { channelThemes } from '../channels/theme'

interface CarouselProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
}

const CARD_WIDTH = 200

export function Carousel({ message, channel, interactive }: CarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  if (message.message.type !== 'carousel') return null
  const { cards } = message.message
  const theme = channelThemes[channel]

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <div className="relative w-full group/carousel">
      <div
        ref={scrollerRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-1"
        role="list"
        aria-label="Carousel of options"
      >
        {cards.map((card) => (
          <CarouselCardView
            key={card.id}
            card={card}
            channel={channel}
            interactive={interactive}
            radiusClass={theme.cardRadius}
          />
        ))}
      </div>
      {cards.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Scroll carousel left"
            onClick={() => scrollBy(-CARD_WIDTH - 10)}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 h-7 w-7 rounded-full bg-white shadow border border-slate-200 items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity focus-visible:opacity-100"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="Scroll carousel right"
            onClick={() => scrollBy(CARD_WIDTH + 10)}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 h-7 w-7 rounded-full bg-white shadow border border-slate-200 items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity focus-visible:opacity-100"
          >
            <ChevronRight size={15} />
          </button>
        </>
      )}
    </div>
  )
}

function CarouselCardView({
  card,
  channel,
  interactive,
  radiusClass,
}: {
  card: CarouselCard
  channel: ChannelId
  interactive: boolean
  radiusClass: string
}) {
  return (
    <div
      role="listitem"
      className={`shrink-0 snap-start bg-white border border-slate-200 shadow-sm ${radiusClass} overflow-hidden flex flex-col ${!interactive ? 'opacity-60' : ''}`}
      style={{ width: CARD_WIDTH }}
    >
      {card.image && (
        <ImageWithFallback src={card.image} alt={card.title} className="w-full h-24 object-cover block" />
      )}
      <div className="p-2.5 flex-1 flex flex-col gap-1">
        {card.badges && card.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.badges.map((badge) => (
              <span
                key={badge}
                className="text-[10px] font-medium uppercase tracking-wide bg-slate-100 text-slate-600 rounded px-1.5 py-0.5"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
        <h5 className="text-[13.5px] font-semibold text-slate-900 m-0">{card.title}</h5>
        {card.subtitle && <p className="text-[12px] text-slate-500 m-0">{card.subtitle}</p>}
        {card.description && <p className="text-[12px] text-slate-600 m-0">{card.description}</p>}
        {card.price && <p className="text-[13px] font-semibold text-slate-900 mt-0.5 m-0">{card.price}</p>}
      </div>
      {card.actions && card.actions.length > 0 && (
        <div className="flex flex-col border-t border-slate-100">
          {card.actions.map((action, i) => (
            <ActionButton key={i} action={action} channel={channel} interactive={interactive} variant="block" />
          ))}
        </div>
      )}
    </div>
  )
}
