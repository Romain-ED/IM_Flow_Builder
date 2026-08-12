import type { ChannelId } from '../schema/flow'

export interface ChannelTheme {
  screenBg: string
  businessBubble: string
  businessBubbleText: string
  userBubble: string
  userBubbleText: string
  bubbleRadius: string
  cardRadius: string
  chipStyle: 'pill' | 'stacked'
  chipBorder: string
  chipText: string
  chipBg: string
  accent: string
  accentText: string
}

export const channelThemes: Record<ChannelId, ChannelTheme> = {
  rcs: {
    screenBg: 'bg-[#f0f4f9]',
    businessBubble: 'bg-white text-slate-900 shadow-sm border border-slate-200',
    businessBubbleText: 'text-slate-900',
    userBubble: 'bg-[#0b57d0] text-white',
    userBubbleText: 'text-white',
    bubbleRadius: 'rounded-2xl',
    cardRadius: 'rounded-2xl',
    chipStyle: 'pill',
    chipBorder: 'border border-[#0b57d0]/30',
    chipText: 'text-[#0b57d0]',
    chipBg: 'bg-white hover:bg-[#e8f0fe]',
    accent: '#0b57d0',
    accentText: 'text-[#0b57d0]',
  },
  whatsapp: {
    screenBg: 'bg-[#e5ddd5]',
    businessBubble: 'bg-white text-slate-900 shadow-sm',
    businessBubbleText: 'text-slate-900',
    userBubble: 'bg-[#d9fdd3] text-slate-900',
    userBubbleText: 'text-slate-900',
    bubbleRadius: 'rounded-lg',
    cardRadius: 'rounded-lg',
    chipStyle: 'stacked',
    chipBorder: 'border-t border-slate-200',
    chipText: 'text-[#00a884]',
    chipBg: 'bg-white hover:bg-slate-50',
    accent: '#00a884',
    accentText: 'text-[#00a884]',
  },
}
