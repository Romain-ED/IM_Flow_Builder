import type { ReactNode } from 'react'
import type { BrandDefinition } from '../../schema/flow'
import { GenericHeader } from './GenericHeader'

export function GenericRenderer({ brand, children }: { brand: BrandDefinition; children: ReactNode }) {
  return (
    <div className="flex flex-col h-full relative">
      <GenericHeader brand={brand} />
      <div className="flex-1 min-h-0 flex flex-col bg-slate-100">{children}</div>
    </div>
  )
}
