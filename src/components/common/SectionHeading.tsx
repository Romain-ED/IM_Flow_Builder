import type { ReactNode } from 'react'
import type { Accent } from '../../utils/accents'

export function SectionHeading({ accent, children }: { accent: Accent; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden="true" />
      {children}
    </span>
  )
}
