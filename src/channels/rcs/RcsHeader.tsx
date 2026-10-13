import { ArrowLeft, BadgeCheck, MoreVertical, Phone, Video } from 'lucide-react'
import { Avatar } from '../../components/phone/Avatar'
import { useSimulatorStore } from '../../store/simulatorStore'
import type { BrandDefinition } from '../../schema/flow'
import { RcsAvatar } from './RcsAvatar'

interface RcsHeaderProps {
  brand: BrandDefinition
  onBrandClick: () => void
}

export function RcsHeader({ brand, onBrandClick }: RcsHeaderProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  const targetProfile = brand.rcsProfile
  const title = targetProfile?.displayName ?? brand.shortName ?? brand.name

  return (
    <div className="shrink-0 border-b border-[#d9d0e8] bg-[#f7f2ff] shadow-[0_1px_3px_rgba(56,36,84,0.08)]">
      <div className="flex min-h-[58px] items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          aria-label="Back navigation"
          onClick={() => showToast('Back navigation is not available in this demo.')}
          className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7950a8] cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={onBrandClick}
          aria-label={`Open ${title} business profile`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-left hover:bg-white/70 active:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7950a8] cursor-pointer"
        >
          {targetProfile ? <RcsAvatar size={36} src={brand.logo ?? brand.avatar} name={brand.name} /> : <Avatar src={brand.logo ?? brand.avatar} name={brand.name} size={36} />}
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-slate-900">{title}</span>
              {brand.verified && <BadgeCheck size={14} className="shrink-0 text-[#7350a3]" aria-label="Verified business" />}
            </span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1">
              <span className="inline-flex shrink-0 items-center rounded-[4px] border border-[#7350a3] px-1 text-[9px] font-semibold leading-[13px] text-[#7350a3]">RCS</span>
              <span className="block truncate text-[11px] text-slate-500">{targetProfile?.subtitle ?? brand.description ?? 'Business messaging'}</span>
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 text-slate-500">
          {!targetProfile && (
            <>
              <button type="button" aria-label="Start video call" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7950a8] cursor-pointer"><Video size={18} /></button>
              <button type="button" aria-label="Call business" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7950a8] cursor-pointer"><Phone size={17} /></button>
            </>
          )}
          <button
            type="button"
            aria-label="More conversation options"
            onClick={() => showToast('More conversation options are not available in this demo.')}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7950a8] cursor-pointer"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
