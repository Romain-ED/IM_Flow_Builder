import { useContext, type ReactNode } from 'react'
import type { Accent } from '../../utils/accents'
import { HideSectionHeadingContext } from './sectionHeadingContext'

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
  const hidden = useContext(HideSectionHeadingContext)
  if (hidden) return null
  return (
    <span
      className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
        tone === 'dark' ? 'text-zinc-500 tracking-[0.08em]' : 'text-slate-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden="true" />
      {children}
    </span>
  )
}
