import type { ReactNode } from 'react'
import type { BrandDefinition } from '../../schema/flow'
import { WhatsAppHeader } from './WhatsAppHeader'

export function WhatsAppRenderer({ brand, children }: { brand: BrandDefinition; children: ReactNode }) {
  return (
    <div className="flex flex-col h-full relative">
      <WhatsAppHeader brand={brand} />
      <div
        className="flex-1 min-h-0 flex flex-col bg-[#e5ddd5]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          backgroundPosition: '0 0, 11px 11px',
        }}
      >
        {children}
      </div>
    </div>
  )
}
