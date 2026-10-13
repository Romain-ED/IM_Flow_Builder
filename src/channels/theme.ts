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
    screenBg: 'bg-[#f7f2ff]',
    businessBubble: 'bg-white text-slate-900 shadow-sm border border-[#e2d9ee]',
    businessBubbleText: 'text-slate-900',
    userBubble: 'bg-[#7350a3] text-white',
    userBubbleText: 'text-white',
    bubbleRadius: 'rounded-2xl',
    cardRadius: 'rounded-[22px]',
    chipStyle: 'pill',
    chipBorder: 'border border-[#7350a3]/30',
    chipText: 'text-[#68458f]',
    chipBg: 'bg-white hover:bg-[#eee5fa]',
    accent: '#7350a3',
    accentText: 'text-[#68458f]',
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
