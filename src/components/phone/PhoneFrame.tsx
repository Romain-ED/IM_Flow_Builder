import type { ReactNode } from 'react'
import type { PhonePlatform } from '../../schema/platform'

export function PhoneFrame({ children, platform = 'ios' }: { children: ReactNode; platform?: PhonePlatform }) {
  return platform === 'android' ? <AndroidPhoneFrame>{children}</AndroidPhoneFrame> : <IPhoneFrame>{children}</IPhoneFrame>
}

function IPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative phone-frame-fit">
      <div className="pointer-events-none absolute -left-[3px] top-[17%] z-10 h-[8%] w-[3px] rounded-l-full bg-gradient-to-r from-slate-500 via-slate-200 to-slate-500 shadow-sm" />
      <div className="pointer-events-none absolute -left-[3px] top-[27%] z-10 h-[6%] w-[3px] rounded-l-full bg-gradient-to-r from-slate-500 via-slate-200 to-slate-500 shadow-sm" />
      <div className="pointer-events-none absolute -left-[3px] top-[35%] z-10 h-[6%] w-[3px] rounded-l-full bg-gradient-to-r from-slate-500 via-slate-200 to-slate-500 shadow-sm" />
      <div className="pointer-events-none absolute -right-[3px] top-[29%] z-10 h-[12%] w-[3px] rounded-r-full bg-gradient-to-l from-slate-500 via-slate-200 to-slate-500 shadow-sm" />
      <div className="phone-device-shell absolute inset-0 rounded-[2.7rem] p-[3px]">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.45rem] bg-white ring-1 ring-black/40">
          <IPhoneStatusBar />
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
          <PhoneHomeIndicator />
        </div>
      </div>
    </div>
  )
}

function AndroidPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative phone-frame-fit">
      <div className="pointer-events-none absolute -left-[3px] top-[23%] z-10 h-[11%] w-[3px] rounded-l-full bg-gradient-to-r from-slate-700 via-slate-300 to-slate-700 shadow-sm" />
      <div className="pointer-events-none absolute -left-[3px] top-[36%] z-10 h-[7%] w-[3px] rounded-l-full bg-gradient-to-r from-slate-700 via-slate-300 to-slate-700 shadow-sm" />
      <div className="pointer-events-none absolute -right-[3px] top-[27%] z-10 h-[15%] w-[3px] rounded-r-full bg-gradient-to-l from-slate-700 via-slate-300 to-slate-700 shadow-sm" />
      <div className="android-device-shell absolute inset-0 rounded-[2.45rem] p-[3px]">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.18rem] bg-white ring-1 ring-black/45">
          <AndroidStatusBar />
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
          <AndroidNavigationBar />
        </div>
      </div>
    </div>
  )
}

function IPhoneStatusBar() {
  return (
    <div className="relative z-10 flex h-9 shrink-0 items-center justify-between bg-white px-6 text-[11px] font-semibold tracking-[0.01em] text-slate-900 select-none">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <SignalBars />
        <WifiIcon />
        <BatteryIcon />
      </div>
      <div className="absolute left-1/2 top-[5px] h-[25px] w-[94px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.35)]">
        <span className="absolute right-[12px] top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-slate-950 ring-1 ring-slate-700/70" />
      </div>
    </div>
  )
}

function AndroidStatusBar() {
  return (
    <div className="relative z-10 flex h-8 shrink-0 items-center justify-between bg-[#f8fafc] px-5 text-[10px] font-medium tracking-[0.01em] text-slate-800 select-none">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-semibold">5G</span>
        <SignalBars />
        <WifiIcon />
        <span className="text-[8px] font-medium">97%</span>
        <BatteryIcon />
      </div>
      <span className="android-punch-hole absolute left-1/2 top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-1 ring-slate-800/80" />
    </div>
  )
}

function PhoneHomeIndicator() {
  return (
    <div className="flex h-5 shrink-0 items-center justify-center bg-white">
      <span className="h-1 w-24 rounded-full bg-slate-950" />
    </div>
  )
}

function AndroidNavigationBar() {
  return (
    <div className="flex h-5 shrink-0 items-center justify-center bg-white">
      <span className="h-1 w-[68px] rounded-full bg-slate-900" />
    </div>
  )
}

function SignalBars() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" aria-hidden="true">
      <rect x="0" y="6" width="2.4" height="4" rx="0.5" />
      <rect x="3.8" y="4" width="2.4" height="6" rx="0.5" />
      <rect x="7.6" y="2" width="2.4" height="8" rx="0.5" />
      <rect x="11.4" y="0" width="2.4" height="10" rx="0.5" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M1 3.5a8 8 0 0 1 11 0" strokeLinecap="round" />
      <path d="M3 6a5 5 0 0 1 7 0" strokeLinecap="round" />
      <circle cx="6.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="17" height="9" rx="2" stroke="currentColor" fill="none" />
      <rect x="18.3" y="3" width="1.3" height="4" rx="0.6" fill="currentColor" />
      <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
    </svg>
  )
}
