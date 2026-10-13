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
  /** Phone chrome (header, composer, bottom area) surfaces. */
  chromeBg: string
  chromeBorder: string
}

export const channelThemes: Record<ChannelId, ChannelTheme> = {
  rcs: {
    screenBg: 'bg-white',
    businessBubble: 'bg-[#f0f4f9] text-slate-900',
    businessBubbleText: 'text-slate-900',
    userBubble: 'bg-[#0b57d0] text-white',
    userBubbleText: 'text-white',
    bubbleRadius: 'rounded-2xl',
    cardRadius: 'rounded-[22px]',
    chipStyle: 'pill',
    chipBorder: 'border border-slate-300',
    chipText: 'text-slate-900',
    chipBg: 'bg-white hover:bg-[#f0f4f9]',
    accent: '#7350a3',
    accentText: 'text-[#68458f]',
    chromeBg: 'bg-white',
    chromeBorder: 'border-slate-200',
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
    chromeBg: 'bg-white',
    chromeBorder: 'border-slate-200',
  },
}
