/**
 * Class tokens for the app's menu chrome: the top header bar and the left
 * sidebar. The export names keep their original `dark*` prefix, but the
 * palette is now light, except the top header bar, which stays dark
 * (slate-950) to contrast with the white sidebar and page content.
 *
 * Palette (Tailwind slate/indigo, literal strings so the JIT scanner sees
 * them): header and sidebar = white on slate-200 borders, body text =
 * slate-800/600, labels/muted = slate-500 (>= 4.6:1 on white), accent =
 * indigo. Solid buttons use the -600/-700 shades so white text stays >= 4.5:1.
 * Tinted buttons and notices use the -50 wash with -700/-800 text.
 */
export type DarkTone = 'indigo' | 'violet' | 'emerald' | 'teal' | 'amber' | 'rose' | 'slate'

/** Visible keyboard focus ring for any interactive element on the chrome. */
export const darkFocusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

export const darkSurface = {
  header: 'bg-slate-950 border-b border-slate-800',
  sidebar: 'bg-white',
  border: 'border-slate-200',
  divider: 'bg-slate-200',
  title: 'text-slate-900',
  text: 'text-slate-800',
  body: 'text-slate-600',
  muted: 'text-slate-500',
} as const

/** Tinted action buttons: dark text on a pale colour wash. */
export const darkTints: Record<DarkTone, string> = {
  indigo: 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  violet: 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  emerald: 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  teal: 'border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100',
  amber: 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  rose: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  slate: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
}

/** Solid emphasised buttons / selected states (white text, >= 4.5:1). */
export const darkSolids = {
  indigo: 'border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700',
  violet: 'border border-violet-600 bg-violet-600 text-white hover:bg-violet-700',
  teal: 'border border-teal-700 bg-teal-700 text-white hover:bg-teal-800',
} as const

/** Inline status boxes (Live RCS notices). */
export const darkNotices: Record<'amber' | 'rose' | 'emerald' | 'indigo', string> = {
  amber: 'border-amber-300 bg-amber-50 text-amber-800',
  rose: 'border-rose-300 bg-rose-50 text-rose-700',
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
}

/** Selects and text inputs. */
export const darkField = `rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[12.5px] text-slate-900 placeholder:text-slate-500 [color-scheme:light] hover:border-slate-400 ${darkFocusRing}`

/** Unselected / selected segmented-control (radio) buttons. */
export const darkSegment = {
  idle: 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900',
  active: darkSolids.indigo,
} as const
