import type { ReactNode } from 'react'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[380px] aspect-[9/19] max-h-full">
      <div className="absolute inset-0 rounded-[2.5rem] bg-slate-900 shadow-2xl p-2.5">
        <div className="relative h-full w-full rounded-[2rem] overflow-hidden bg-white flex flex-col">
          <StatusBar />
          <div className="relative flex-1 min-h-0 flex flex-col">{children}</div>
        </div>
        <div className="absolute left-1/2 top-2.5 -translate-x-1/2 h-4 w-24 bg-slate-900 rounded-full" />
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="shrink-0 h-7 flex items-center justify-between px-6 text-[11px] font-medium text-slate-900 bg-white select-none">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <SignalBars />
        <WifiIcon />
        <BatteryIcon />
      </div>
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
