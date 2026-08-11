import { ArrowLeft, MoreVertical, BadgeCheck } from 'lucide-react'
import { Avatar } from '../../components/phone/Avatar'
import type { BrandDefinition } from '../../schema/flow'

export function GenericHeader({ brand }: { brand: BrandDefinition }) {
  return (
    <div className="shrink-0 bg-slate-800 text-white">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <ArrowLeft size={19} className="shrink-0" aria-hidden="true" />
        <Avatar src={brand.avatar} name={brand.name} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[14.5px] font-medium truncate">{brand.shortName ?? brand.name}</span>
            {brand.verified && <BadgeCheck size={13} className="shrink-0" aria-label="Verified business" />}
          </div>
          <span className="block truncate text-[11.5px] text-white/60">Business messaging</span>
        </div>
        <MoreVertical size={18} className="shrink-0" aria-hidden="true" />
      </div>
    </div>
  )
}
