import { ArrowLeft, MoreVertical, Phone, Video, BadgeCheck } from 'lucide-react'
import { Avatar } from '../../components/phone/Avatar'
import type { BrandDefinition } from '../../schema/flow'

export function RcsHeader({ brand }: { brand: BrandDefinition }) {
  return (
    <div className="shrink-0 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <ArrowLeft size={19} className="text-slate-600 shrink-0" aria-hidden="true" />
        <Avatar src={brand.avatar} name={brand.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[14.5px] font-medium text-slate-900 truncate">
              {brand.shortName ?? brand.name}
            </span>
            {brand.verified && (
              <BadgeCheck size={14} className="text-[#0b57d0] shrink-0" aria-label="Verified business" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center rounded-[4px] border border-[#0b57d0] text-[#0b57d0] text-[9.5px] font-semibold px-1 leading-tight">
              RCS
            </span>
            <span className="text-[11.5px] text-slate-500">Business messaging</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-500 shrink-0">
          <Video size={18} aria-hidden="true" />
          <Phone size={17} aria-hidden="true" />
          <MoreVertical size={18} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
