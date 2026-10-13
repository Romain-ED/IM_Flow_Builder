import {
  ArrowLeft,
  ChevronRight,
  Globe2,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  Search,
} from 'lucide-react'
import type { BrandDefinition, RcsProfile } from '../../schema/flow'
import { useSimulatorStore } from '../../store/simulatorStore'
import { ImageWithFallback } from '../common/ImageWithFallback'
import { RcsAvatar } from '../../channels/rcs/RcsAvatar'
import { assetUrl } from '../../utils/assetUrl'

interface RcsBusinessProfileViewProps {
  brand: BrandDefinition
  open: boolean
  onClose: () => void
}

export function RcsBusinessProfileView({ brand, open, onClose }: RcsBusinessProfileViewProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  const profile = brand.rcsProfile
  if (!open || !profile) return null

  const unavailable = (label: string) => showToast(`${label} is not available in this demo.`)

  return (
    <div className="absolute inset-0 z-50 flex min-w-0 flex-col overflow-hidden bg-white text-slate-900 animate-message-in">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2">
        <button type="button" onClick={onClose} aria-label="Back to conversation" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-[#f0f4f9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] cursor-pointer"><ArrowLeft size={19} /></button>
        <span className="flex-1 text-[14px] font-medium">Info &amp; options</span>
        <button type="button" onClick={() => unavailable('More profile options')} aria-label="More profile options" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#f0f4f9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] cursor-pointer"><MoreVertical size={18} /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
        <ProfileBanner profile={profile} banner={brand.banner} />
        <div className="relative -mt-8 px-4 pb-4 text-center">
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white p-1.5 shadow-md ring-1 ring-slate-200">
            <RcsAvatar size={60} src={brand.logo ?? brand.avatar} name={brand.name} />
          </div>
          <h1 className="mt-2 text-[18px] font-semibold tracking-[-0.01em]">{profile.displayName}</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">{profile.subtitle}</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <a href={`tel:${profile.phone}`} className="rcs-profile-action"><span><Phone size={16} /></span><strong>Call</strong></a>
            <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="rcs-profile-action"><span><Globe2 size={16} /></span><strong>Website</strong></a>
            <a href={`mailto:${profile.email}`} className="rcs-profile-action"><span><Mail size={16} /></span><strong>Email</strong></a>
            <button type="button" onClick={() => unavailable('Search')} className="rcs-profile-action"><span><Search size={16} /></span><strong>Search</strong></button>
          </div>
        </div>

        <section className="border-y border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium">Images</span>
            <span className="text-[12px] text-slate-500">{profile.imageCount}</span>
            <ChevronRight size={17} className="ml-auto text-slate-400" />
          </div>
          <div className="mt-2 flex gap-2 overflow-hidden">
            {profile.imageUrls.slice(0, 3).map((url, index) => <ImageWithFallback key={url} src={url} alt={`Profile pizza image ${index + 1}`} className="h-[66px] min-w-0 flex-1 rounded-xl object-cover" />)}
          </div>
        </section>

        <div className="space-y-3 px-3 py-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ProfileDetail href={`tel:${profile.phone}`} icon={<Phone size={17} />} value={profile.phone} label="Phone" />
            <ProfileDetail href={profile.websiteUrl} icon={<Globe2 size={17} />} value={profile.websiteLabel} label="Website" external />
            <ProfileDetail href={`mailto:${profile.email}`} icon={<Mail size={17} />} value={profile.email} label="Email" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ProfileLink href={profile.privacyPolicyUrl} label="View Privacy Policy" fallback={() => unavailable('Privacy policy')} />
            <ProfileLink href={profile.termsUrl} label="View Terms of Service" fallback={() => unavailable('Terms of service')} />
            <ProfileButton label="Notifications" onClick={() => unavailable('Notifications')} />
            <ProfileButton label="Chat theme" onClick={() => unavailable('Chat theme')} />
            <ProfileButton label="Archive" onClick={() => unavailable('Archive')} />
          </section>

          <button type="button" onClick={() => unavailable('Block and report spam')} className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-left text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400 cursor-pointer">Block and report spam</button>
          <p className="px-3 pb-2 text-center text-[10px] leading-4 text-slate-400">Your chats with this business are end-to-end encrypted. <button type="button" onClick={() => unavailable('Learn more')} className="font-medium text-[#0b57d0] underline cursor-pointer">Learn more</button></p>
        </div>
      </div>
    </div>
  )
}

function ProfileBanner({ profile, banner }: { profile: RcsProfile; banner?: string }) {
  return (
    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#157a55] via-[#229a66] to-[#74c46d] px-5 py-4 text-white">
      {banner && <img src={assetUrl(banner)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {!banner && <div className="absolute -right-9 -top-10 h-40 w-40 rounded-full border-[18px] border-white/15" />}
      {!banner && <div className="absolute -bottom-16 left-20 h-44 w-44 rounded-full border-[24px] border-white/10" />}
      {/* A supplied banner already carries its own artwork, so the placeholder text overlay is only for the default banner. */}
      {!banner && <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[22px] font-bold tracking-tight">Romain</div>
            <div className="mt-0.5 text-[12px] font-medium text-white/90">RCS Agent Demo</div>
          </div>
          <div className="flex items-center gap-1 text-[24px] font-semibold"><span className="text-[27px]">R</span><MessageCircle size={21} /><MessageCircle size={15} className="-ml-2 mt-3" /></div>
        </div>
        <div className="text-[14px] font-semibold tracking-wide">{profile.brandLabel}</div>
      </div>}
    </div>
  )
}

function ProfileDetail({ href, icon, value, label, external = false }: { href: string; icon: React.ReactNode; value: string; label: string; external?: boolean }) {
  return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="profile-detail-row border-slate-100 first-of-type:mt-0"><span className="text-[#0b57d0]">{icon}</span><span><strong>{value}</strong><small>{label}</small></span>{external && <ChevronRight size={14} className="ml-auto text-slate-400" />}</a>
}

function ProfileLink({ href, label, fallback }: { href?: string; label: string; fallback: () => void }) {
  if (href) return <a href={href} target="_blank" rel="noreferrer" className="flex items-center border-t border-slate-100 px-4 py-3 text-[13px] text-slate-700 first:border-t-0 hover:bg-[#f0f4f9]">{label}<ChevronRight size={16} className="ml-auto text-slate-400" /></a>
  return <ProfileButton label={label} onClick={fallback} />
}

function ProfileButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center border-t border-slate-100 px-4 py-3 text-left text-[13px] text-slate-700 first:border-t-0 hover:bg-[#f0f4f9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0b57d0] cursor-pointer">{label}<ChevronRight size={16} className="ml-auto text-slate-400" /></button>
}
