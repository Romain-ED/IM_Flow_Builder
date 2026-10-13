import type { ReactNode } from 'react'
import type { BrandDefinition } from '../../schema/flow'
import { channelThemes } from '../theme'
import { RcsHeader } from './RcsHeader'

export function RcsRenderer({ brand, children, onBrandClick }: { brand: BrandDefinition; children: ReactNode; onBrandClick: () => void }) {
  return (
    <div className={`flex h-full min-w-0 flex-col relative overflow-hidden ${channelThemes.rcs.screenBg}`}>
      <RcsHeader brand={brand} onBrandClick={onBrandClick} />
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${channelThemes.rcs.screenBg}`}>{children}</div>
    </div>
  )
}
