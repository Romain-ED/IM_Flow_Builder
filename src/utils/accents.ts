/**
 * A small, deliberately restrained semantic color palette used to give
 * different control groups and actions a distinct identity (Tailwind's JIT
 * scanner needs each class name written out in full somewhere in the
 * source, so these are literal strings rather than built from a template).
 */
export type AccentColor = 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'teal' | 'slate'

export interface Accent {
  text: string
  dot: string
  bg: string
  bgHover: string
  border: string
  solid: string
  solidHover: string
  ring: string
}

export const accents: Record<AccentColor, Accent> = {
  indigo: {
    text: 'text-indigo-600',
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50',
    bgHover: 'hover:bg-indigo-100',
    border: 'border-indigo-200',
    solid: 'bg-indigo-600',
    solidHover: 'hover:bg-indigo-700',
    ring: 'focus-visible:outline-indigo-500',
  },
  violet: {
    text: 'text-violet-600',
    dot: 'bg-violet-500',
    bg: 'bg-violet-50',
    bgHover: 'hover:bg-violet-100',
    border: 'border-violet-200',
    solid: 'bg-violet-600',
    solidHover: 'hover:bg-violet-700',
    ring: 'focus-visible:outline-violet-500',
  },
  emerald: {
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    bgHover: 'hover:bg-emerald-100',
    border: 'border-emerald-200',
    solid: 'bg-emerald-600',
    solidHover: 'hover:bg-emerald-700',
    ring: 'focus-visible:outline-emerald-500',
  },
  amber: {
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    border: 'border-amber-200',
    solid: 'bg-amber-500',
    solidHover: 'hover:bg-amber-600',
    ring: 'focus-visible:outline-amber-500',
  },
  rose: {
    text: 'text-rose-600',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    bgHover: 'hover:bg-rose-100',
    border: 'border-rose-200',
    solid: 'bg-rose-600',
    solidHover: 'hover:bg-rose-700',
    ring: 'focus-visible:outline-rose-500',
  },
  teal: {
    text: 'text-teal-600',
    dot: 'bg-teal-500',
    bg: 'bg-teal-50',
    bgHover: 'hover:bg-teal-100',
    border: 'border-teal-200',
    solid: 'bg-teal-600',
    solidHover: 'hover:bg-teal-700',
    ring: 'focus-visible:outline-teal-500',
  },
  slate: {
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    bg: 'bg-slate-50',
    bgHover: 'hover:bg-slate-100',
    border: 'border-slate-200',
    solid: 'bg-slate-800',
    solidHover: 'hover:bg-slate-900',
    ring: 'focus-visible:outline-slate-500',
  },
}

/** Section identity colors used consistently across the sidebar and pages. */
export const sectionAccents = {
  scenario: accents.indigo,
  channel: accents.violet,
  brand: accents.slate,
  variables: accents.emerald,
  debug: accents.amber,
  playback: accents.rose,
  inspector: accents.teal,
} as const
