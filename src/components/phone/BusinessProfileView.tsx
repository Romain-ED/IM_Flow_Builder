import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Globe2,
  Info,
  Mail,
  MoreVertical,
  Phone,
  SlidersHorizontal,
} from 'lucide-react'
import type { ChannelId } from '../../schema/flow'
import type { BrandDefinition } from '../../schema/flow'
import { RcsBusinessProfileView } from './RcsBusinessProfileView'
import { Avatar } from './Avatar'

interface BusinessProfileViewProps {
  brand: BrandDefinition
  channel: ChannelId
  open: boolean
  onClose: () => void
}

function websiteLabel(website: string) {
  return website.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function BusinessProfileView({ brand, channel, open, onClose }: BusinessProfileViewProps) {
  if (channel === 'rcs') {
    return <RcsBusinessProfileView brand={brand} open={open} onClose={onClose} />
  }
  if (!open) return null

  const displayName = brand.shortName ?? brand.name
  const hasContactDetails = Boolean(brand.supportPhone || brand.website || brand.email)
  const isWhatsApp = channel === 'whatsapp'

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#f8fafc] text-slate-900 animate-message-in">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to conversation"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft size={19} />
        </button>
        <span className="flex-1 text-[14px] font-medium">Info &amp; options</span>
        <button
          type="button"
          aria-label="More profile options"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
        <div className={`relative h-28 overflow-hidden ${isWhatsApp ? 'bg-[#d9fdd3]' : 'bg-[#dbeafe]'}`}>
          <div className={`absolute -right-8 -top-12 h-44 w-44 rounded-full blur-2xl ${isWhatsApp ? 'bg-emerald-200/80' : 'bg-blue-200/80'}`} />
          <div className={`absolute -bottom-20 -left-10 h-40 w-56 rounded-full blur-3xl ${isWhatsApp ? 'bg-lime-100/80' : 'bg-indigo-100/80'}`} />
        </div>

        <div className="relative -mt-10 px-5 pb-5 text-center">
          <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white p-1 shadow-md ring-1 ring-black/5">
            <Avatar src={brand.logo ?? brand.avatar} name={brand.name} size={68} />
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            <h1 className="max-w-[90%] truncate text-[18px] font-semibold tracking-[-0.01em]">{displayName}</h1>
            {brand.verified && <BadgeCheck size={16} className="shrink-0 text-[#0b57d0]" aria-label="Verified business" />}
          </div>
          <p className="mt-1 text-[12px] text-slate-500">{brand.description || 'Business account'}</p>

          <div className="mt-5 flex justify-center gap-5">
            {brand.supportPhone && (
              <a href={`tel:${brand.supportPhone}`} className="profile-action">
                <span className="profile-action-icon"><Phone size={16} /></span>
                <span>Call</span>
              </a>
            )}
            {brand.website && (
              <a href={brand.website} target="_blank" rel="noreferrer" className="profile-action">
                <span className="profile-action-icon"><Globe2 size={16} /></span>
                <span>Website</span>
              </a>
            )}
            {brand.email && (
              <a href={`mailto:${brand.email}`} className="profile-action">
                <span className="profile-action-icon"><Mail size={16} /></span>
                <span>Email</span>
              </a>
            )}
          </div>
        </div>

        <div className="flex border-y border-slate-200 bg-white px-4">
          <div className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-blue-500 py-2.5 text-[11px] font-medium text-slate-800">
            <Info size={13} /> Info
          </div>
          <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] text-slate-500">
            <SlidersHorizontal size={13} /> Options
          </div>
        </div>

        <div className="space-y-3 px-3 py-4">
          {brand.description && (
            <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">About</p>
              <p className="mt-1 text-[12px] leading-5 text-slate-700">{brand.description}</p>
            </section>
          )}

          {hasContactDetails && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Contact details</p>
              {brand.supportPhone && (
                <a href={`tel:${brand.supportPhone}`} className="profile-detail-row">
                  <Phone size={16} />
                  <span><strong>{brand.supportPhone}</strong><small>Phone</small></span>
                </a>
              )}
              {brand.website && (
                <a href={brand.website} target="_blank" rel="noreferrer" className="profile-detail-row">
                  <Globe2 size={16} />
                  <span><strong>{websiteLabel(brand.website)}</strong><small>Website</small></span>
                  <ExternalLink size={13} className="ml-auto text-slate-400" />
                </a>
              )}
              {brand.email && (
                <a href={`mailto:${brand.email}`} className="profile-detail-row">
                  <Mail size={16} />
                  <span><strong>{brand.email}</strong><small>Email</small></span>
                </a>
              )}
            </section>
          )}

          <p className="px-2 text-center text-[10px] leading-4 text-slate-400">Business profile · {isWhatsApp ? 'WhatsApp' : 'RCS'} messaging</p>
        </div>
      </div>
    </div>
  )
}
