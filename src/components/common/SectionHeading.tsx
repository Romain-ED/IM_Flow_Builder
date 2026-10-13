import type { ReactNode } from 'react'
import type { Accent } from '../../utils/accents'

export function SectionHeading({
  accent,
  tone = 'light',
  children,
}: {
  accent: Accent
  /** `dark` for headings placed on the dark sidebar surface. */
  tone?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <span
      className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
        tone === 'dark' ? 'text-slate-400' : 'text-slate-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden="true" />
      {children}
    </span>
  )
}
