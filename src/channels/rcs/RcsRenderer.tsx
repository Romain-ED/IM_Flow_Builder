import type { ReactNode } from 'react'
import type { BrandDefinition } from '../../schema/flow'
import { RcsHeader } from './RcsHeader'

export function RcsRenderer({ brand, children }: { brand: BrandDefinition; children: ReactNode }) {
  return (
    <div className="flex flex-col h-full relative">
      <RcsHeader brand={brand} />
      <div className="flex-1 min-h-0 flex flex-col bg-[#f0f4f9]">{children}</div>
    </div>
  )
}
