import { ArrowLeft, BadgeCheck, MoreVertical, Video } from 'lucide-react'
import { Avatar } from '../../components/phone/Avatar'
import type { BrandDefinition } from '../../schema/flow'

interface WhatsAppHeaderProps {
  brand: BrandDefinition
  onBrandClick: () => void
}

export function WhatsAppHeader({ brand, onBrandClick }: WhatsAppHeaderProps) {
  return (
    <div className="shrink-0 bg-[#075e54] text-white shadow-[0_1px_3px_rgba(0,0,0,0.16)]">
      <div className="flex min-h-[58px] items-center gap-1.5 px-2 py-1.5">
        <button type="button" aria-label="Back" className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10 cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={onBrandClick}
          aria-label={`Open ${brand.name} business profile`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-left hover:bg-white/10 active:bg-white/15 cursor-pointer"
        >
          <Avatar src={brand.avatar} name={brand.name} size={35} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-[14px] font-semibold tracking-[-0.01em]">{brand.shortName ?? brand.name}</span>
              {brand.verified && <BadgeCheck size={14} className="shrink-0" aria-label="Verified business" />}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-white/70">{brand.description || 'Business account'}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" aria-label="Start video call" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"><Video size={18} /></button>
          <button type="button" aria-label="More conversation options" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"><MoreVertical size={18} /></button>
        </div>
      </div>
    </div>
  )
}
