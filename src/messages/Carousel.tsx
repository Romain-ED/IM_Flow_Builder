import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import type { CarouselCard, MediaHeight } from '../schema/messages'
import { ImageWithFallback } from '../components/common/ImageWithFallback'
import { FormattedText } from '../components/common/FormattedText'
import { ActionButton } from '../components/phone/ActionButton'
import { channelThemes } from '../channels/theme'
import { assetUrl } from '../utils/assetUrl'
import { RCS_ACTION_STACK } from '../channels/rcs/cardStyles'

/**
 * RCS carousel media is fluid in Google Messages rather than a fixed
 * simulator pixel box. These ratios preserve the short/medium/tall density
 * choices while allowing a phone-width card to scale beyond the 112/168/264
 * DP standalone-card heights; object-cover keeps Google's centered crop.
 */
const RCS_CAROUSEL_MEDIA_RATIOS: Record<MediaHeight, string> = {
  short: '2.5 / 1',
  medium: '1.82 / 1',
  tall: '1.5 / 1',
}

interface CarouselProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
}

export function Carousel({ message, channel, interactive }: CarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  if (message.message.type !== 'carousel') return null
  const { cards, mediaHeight = 'medium' } = message.message
  const theme = channelThemes[channel]
  const isRcs = channel === 'rcs'
  function scrollBy(direction: 1 | -1) {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollBy({ left: direction * Math.max(1, scroller.clientWidth - 56), behavior: 'smooth' })
  }

  return (
    <>
      <div className="w-full min-w-0 group/carousel">
        <div
          ref={scrollerRef}
          className="flex min-w-0 gap-2.5 overflow-x-auto overscroll-x-contain no-scrollbar scroll-smooth snap-x snap-mandatory pb-1"
          role="list"
          aria-label="Carousel of options"
        >
          {cards.map((card, index) => (
            <CarouselCardView
              key={card.id}
              card={card}
              cardIndex={index}
              channel={channel}
              interactive={interactive}
              radiusClass={theme.cardRadius}
              onImageClick={() => setSelectedIndex(index)}
              mediaHeight={mediaHeight}
            />
          ))}
        </div>
        {cards.length > 1 && interactive && (
          <>
            <button
              type="button"
              aria-label="Scroll carousel left"
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-1/2 hidden h-7 w-7 -translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow opacity-0 transition-opacity hover:bg-slate-50 focus-visible:opacity-100 group-hover/carousel:opacity-100 sm:flex"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              aria-label="Scroll carousel right"
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-1/2 hidden h-7 w-7 translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow opacity-0 transition-opacity hover:bg-slate-50 focus-visible:opacity-100 group-hover/carousel:opacity-100 sm:flex"
            >
              <ChevronRight size={15} />
            </button>
          </>
        )}
      </div>
      {isRcs && selectedIndex !== null && (
        <CarouselImageViewer
          cards={cards}
          selectedIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onSelect={setSelectedIndex}
        />
      )}
    </>
  )
}

function CarouselCardView({
  card,
  cardIndex,
  channel,
  interactive,
  radiusClass,
  onImageClick,
  mediaHeight,
}: {
  card: CarouselCard
  cardIndex: number
  channel: ChannelId
  interactive: boolean
  radiusClass: string
  onImageClick: () => void
  mediaHeight: MediaHeight
}) {
  const isRcs = channel === 'rcs'

  return (
    <div
      role="listitem"
      className={`relative shrink-0 snap-start overflow-hidden ${isRcs ? 'bg-[#f0f4f9]' : 'border border-slate-200 bg-white shadow-sm'} ${radiusClass} flex flex-col ${!interactive ? 'opacity-60' : ''}`}
      style={{ width: isRcs ? 'min(calc(100% - 16px), 418px)' : '200px' }}
    >
      {card.image && (
        <button
          type="button"
          aria-label={`Open image for ${card.title}`}
          onClick={channel === 'rcs' ? onImageClick : undefined}
          className={`block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#7350a3] ${channel === 'rcs' ? 'cursor-zoom-in' : ''}`}
        >
          <ImageWithFallback
            src={card.image}
            alt={card.title}
            className={`block ${isRcs ? 'w-full object-cover' : 'h-28 w-full object-cover'}`}
            style={isRcs ? { aspectRatio: RCS_CAROUSEL_MEDIA_RATIOS[mediaHeight] } : undefined}
          />
        </button>
      )}
      <div className={`flex flex-1 flex-col ${isRcs ? 'gap-1 px-4 pb-2 pt-4' : 'gap-1 p-3'}`}>
        {card.badges && card.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.badges.map((badge) => (
              <span key={badge} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                {badge}
              </span>
            ))}
          </div>
        )}
        <h5 className={`m-0 ${isRcs ? 'text-[14.5px]' : 'text-[13.5px]'} font-semibold leading-snug text-slate-900`}>{card.title}</h5>
        {card.subtitle && <p className="m-0 text-[12px] text-slate-500"><FormattedText text={card.subtitle} /></p>}
        {card.description && <p className={`m-0 leading-snug text-slate-600 ${isRcs ? 'text-[13px]' : 'text-[12px]'}`}><FormattedText text={card.description} /></p>}
        {card.price && <p className="m-0 mt-0.5 text-[13px] font-semibold text-slate-900">{card.price}</p>}
      </div>
      {card.actions && card.actions.length > 0 && (
        <div className={isRcs ? `${RCS_ACTION_STACK} px-3 pb-3 pt-1` : 'flex flex-col border-t border-slate-100'}>
          {card.actions.map((action, i) => <ActionButton key={i} action={action} channel={channel} interactive={interactive} variant="block" />)}
        </div>
      )}
      <span className="sr-only">Carousel card {cardIndex + 1}</span>
    </div>
  )
}

function CarouselImageViewer({
  cards,
  selectedIndex,
  onClose,
  onSelect,
}: {
  cards: CarouselCard[]
  selectedIndex: number
  onClose: () => void
  onSelect: (index: number) => void
}) {
  const selected = cards[selectedIndex]
  const previous = cards[selectedIndex - 1]
  const next = cards[selectedIndex + 1]

  return (
    <div className="absolute inset-0 z-50 flex min-w-0 flex-col overflow-hidden bg-[#111016]/95 text-white" role="dialog" aria-modal="true" aria-label="Carousel image viewer">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-35 blur-2xl"
        style={selected.image ? { backgroundImage: `url(${assetUrl(selected.image)})` } : undefined}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#111016]/70" aria-hidden="true" />
      <div className="relative z-10 flex items-center px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image viewer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
        >
          <X size={22} />
        </button>
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center gap-2 px-1 pb-8">
        {previous ? <NeighborImage card={previous} onClick={() => onSelect(selectedIndex - 1)} label="Previous carousel image" /> : <div className="w-10 shrink-0" />}
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <ImageWithFallback src={selected.image} alt={selected.title} className="max-h-[76%] w-full rounded-[28px] object-contain shadow-2xl" />
        </div>
        {next ? <NeighborImage card={next} onClick={() => onSelect(selectedIndex + 1)} label="Next carousel image" /> : <div className="w-10 shrink-0" />}
      </div>
    </div>
  )
}

function NeighborImage({ card, onClick, label }: { card: CarouselCard; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="w-10 shrink-0 overflow-hidden rounded-xl opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white cursor-pointer">
      <ImageWithFallback src={card.image} alt={card.title} className="h-24 w-10 object-cover" />
    </button>
  )
}
