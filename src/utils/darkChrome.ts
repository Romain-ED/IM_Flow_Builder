/**
 * Class tokens for the app's dark chrome — the top header bar and the left
 * sidebar. The main stage, phone, and the Scenarios/Manual/Live logs page
 * bodies stay light; only these two regions use this palette.
 *
 * Palette (Tailwind slate/indigo, literal strings so the JIT scanner sees
 * them): header = slate-950, sidebar = slate-900, borders = slate-800,
 * body text = slate-100/300, labels/muted = slate-400 (>= 6.9:1 on slate-900),
 * accent = indigo. Solid buttons use the -600/-700 shades so white text stays
 * >= 4.5:1.
 */
export type DarkTone = 'indigo' | 'violet' | 'emerald' | 'teal' | 'amber' | 'rose' | 'slate'

/** Visible keyboard focus ring for any interactive element on a dark surface. */
export const darkFocusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300'

export const darkSurface = {
  header: 'bg-slate-950 border-b border-slate-800',
  sidebar: 'bg-slate-900',
  border: 'border-slate-800',
  divider: 'bg-slate-800',
  title: 'text-white',
  text: 'text-slate-100',
  body: 'text-slate-300',
  muted: 'text-slate-400',
} as const

/** Tinted (translucent) action buttons: readable light text on a coloured wash. */
export const darkTints: Record<DarkTone, string> = {
  indigo: 'border border-indigo-400/40 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25',
  violet: 'border border-violet-400/40 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25',
  emerald: 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25',
  teal: 'border border-teal-400/40 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25',
  amber: 'border border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25',
  rose: 'border border-rose-400/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25',
  slate: 'border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700',
}

/** Solid emphasised buttons / selected states (white text, >= 4.5:1). */
export const darkSolids = {
  indigo: 'border border-indigo-300/60 bg-indigo-600 text-white hover:brightness-110',
  violet: 'border border-violet-300/60 bg-violet-600 text-white hover:brightness-110',
  teal: 'border border-teal-300/60 bg-teal-700 text-white hover:brightness-110',
} as const

/** Inline status boxes (Live RCS notices). */
export const darkNotices: Record<'amber' | 'rose' | 'emerald' | 'indigo', string> = {
  amber: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  rose: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  emerald: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  indigo: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-200',
}

/** Selects and text inputs. */
export const darkField = `rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12.5px] text-slate-100 placeholder:text-slate-400 [color-scheme:dark] hover:border-slate-500 ${darkFocusRing}`

/** Unselected / selected segmented-control (radio) buttons. */
export const darkSegment = {
  idle: 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white',
  active: darkSolids.indigo,
} as const
