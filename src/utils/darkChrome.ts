/**
 * Class tokens for the app's menu chrome: the top header bar and the left
 * sidebar. Used ONLY on those dark surfaces (the Scenarios page editors use
 * their own light classes).
 *
 * Palette (0.35.0 redesign, literal strings so the JIT scanner sees them):
 * header = zinc-950, sidebar = zinc-900, raised controls = white/5 wash with
 * white/10 hairline borders, body text = zinc-300, labels/muted = zinc-400
 * (>= 4.5:1 on zinc-900), a single indigo accent for primary actions and
 * selected states. Status colours appear only as translucent notice washes
 * with -200/-300 text.
 */
export type DarkTone = 'indigo' | 'violet' | 'emerald' | 'teal' | 'amber' | 'rose' | 'slate'

/** Visible keyboard focus ring for any interactive element on the chrome. */
export const darkFocusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400'

export const darkSurface = {
  header: 'bg-zinc-950 border-b border-white/[0.06]',
  sidebar: 'bg-zinc-900',
  border: 'border-white/[0.06]',
  divider: 'bg-white/10',
  title: 'text-white',
  text: 'text-zinc-100',
  body: 'text-zinc-300',
  muted: 'text-zinc-400',
} as const

/**
 * Secondary action buttons. Deliberately near-monochrome: a soft wash with a
 * hairline border; the tone only tints the text so the panel stays calm.
 */
const GHOST = 'border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20'
export const darkTints: Record<DarkTone, string> = {
  indigo: `${GHOST} text-zinc-100`,
  violet: `${GHOST} text-zinc-100`,
  emerald: `${GHOST} text-zinc-100`,
  teal: `${GHOST} text-zinc-100`,
  amber: `${GHOST} text-zinc-100`,
  rose: 'border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  slate: `${GHOST} text-zinc-200`,
}

/** Solid emphasised buttons / selected states (white text, >= 4.5:1). */
const SOLID = 'border border-indigo-400/30 bg-indigo-500 text-white shadow-sm shadow-indigo-950/40 hover:bg-indigo-400'
export const darkSolids = {
  indigo: SOLID,
  violet: SOLID,
  teal: SOLID,
} as const

/** Inline status boxes (Live RCS notices). */
export const darkNotices: Record<'amber' | 'rose' | 'emerald' | 'indigo', string> = {
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  rose: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
  emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  indigo: 'border-white/10 bg-white/[0.04] text-zinc-300',
}

/** Selects and text inputs. */
export const darkField = `rounded-lg border border-white/10 bg-zinc-950/60 px-2.5 py-2 text-[12.5px] text-zinc-100 placeholder:text-zinc-500 [color-scheme:dark] hover:border-white/20 focus:border-indigo-400/60 ${darkFocusRing}`

/** Unselected / selected segmented-control (radio) buttons. */
export const darkSegment = {
  idle: 'border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white',
  active: SOLID,
} as const
