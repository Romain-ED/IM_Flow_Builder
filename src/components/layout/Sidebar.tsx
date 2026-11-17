import { useState, type ReactNode } from 'react'
import {
  Bug,
  ChevronDown,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Radio,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { ScenarioControls } from '../controls/ScenarioControls'
import { ChannelSelector } from '../controls/ChannelSelector'
import { PhonePlatformSelector } from '../controls/PhonePlatformSelector'
import { DebugOptions } from '../controls/DebugOptions'
import { PlaybackControls } from '../controls/PlaybackControls'
import { LiveRcsControls } from '../controls/LiveRcsControls'
import { HideSectionHeadingContext } from '../common/sectionHeadingContext'
import { sectionAccents, type Accent } from '../../utils/accents'
import { darkFocusRing, darkSurface } from '../../utils/darkChrome'
import { assetUrl } from '../../utils/assetUrl'

type SectionId = 'scenario' | 'device' | 'live' | 'debug'

interface SidebarPrefs {
  collapsed: boolean
  open: Record<SectionId, boolean>
}

const STORAGE_KEY = 'imfb.sidebar.v1'

/** Pastel identity per section (literal class strings so Tailwind's scanner sees them). */
interface SectionTone {
  /** Section container: pastel wash and border. */
  section: string
  /** Header button: slightly stronger wash, plus hover. */
  header: string
  /** Icon-rail button. */
  rail: string
  /** Thin divider inside the section. */
  divider: string
}

const TONES = {
  indigo: { section: 'border-indigo-300 bg-indigo-50', header: 'bg-indigo-100 hover:bg-indigo-200/70', rail: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', divider: 'bg-indigo-200' },
  violet: { section: 'border-violet-300 bg-violet-50', header: 'bg-violet-100 hover:bg-violet-200/70', rail: 'bg-violet-100 text-violet-700 hover:bg-violet-200', divider: 'bg-violet-200' },
  teal: { section: 'border-teal-300 bg-teal-50', header: 'bg-teal-100 hover:bg-teal-200/70', rail: 'bg-teal-100 text-teal-700 hover:bg-teal-200', divider: 'bg-teal-200' },
  amber: { section: 'border-amber-300 bg-amber-50', header: 'bg-amber-100 hover:bg-amber-200/70', rail: 'bg-amber-100 text-amber-700 hover:bg-amber-200', divider: 'bg-amber-200' },
} satisfies Record<string, SectionTone>

const PLAYBACK_TONE = { section: 'border-rose-200 bg-rose-50', rail: 'bg-rose-100 text-rose-700 hover:bg-rose-200' }

const SECTIONS: { id: SectionId; title: string; icon: LucideIcon; accent: Accent; tone: SectionTone }[] = [
  { id: 'scenario', title: 'Scenario', icon: FileText, accent: sectionAccents.scenario, tone: TONES.indigo },
  { id: 'device', title: 'Channel & device', icon: Smartphone, accent: sectionAccents.channel, tone: TONES.violet },
  { id: 'live', title: 'Live RCS', icon: Radio, accent: sectionAccents.inspector, tone: TONES.teal },
  { id: 'debug', title: 'Debug', icon: Bug, accent: sectionAccents.debug, tone: TONES.amber },
]

const DEFAULT_PREFS: SidebarPrefs = {
  collapsed: false,
  open: { scenario: true, device: true, live: false, debug: false },
}

function loadPrefs(): SidebarPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs> | null
    const stored = parsed?.open
    const open = { ...DEFAULT_PREFS.open }
    for (const { id } of SECTIONS) {
      if (typeof stored?.[id] === 'boolean') open[id] = stored[id]
    }
    return { collapsed: parsed?.collapsed === true, open }
  } catch {
    return DEFAULT_PREFS
  }
}

function savePrefs(prefs: SidebarPrefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Storage can be unavailable (private mode); the layout just won't persist.
  }
}

/**
 * Left control panel. Groups the controls into collapsible sections, keeps
 * Playback pinned at the bottom, and (on desktop) can shrink to an icon rail.
 */
export function Sidebar({ onOpenEditor, collapsible = false }: { onOpenEditor: () => void; collapsible?: boolean }) {
  const [prefs, setPrefs] = useState<SidebarPrefs>(loadPrefs)
  const rail = collapsible && prefs.collapsed

  function update(change: (prev: SidebarPrefs) => SidebarPrefs) {
    setPrefs((prev) => {
      const next = change(prev)
      savePrefs(next)
      return next
    })
  }

  const toggleSection = (id: SectionId) => update((p) => ({ ...p, open: { ...p.open, [id]: !p.open[id] } }))
  const setCollapsed = (collapsed: boolean) => update((p) => ({ ...p, collapsed }))
  const expandTo = (id: SectionId) => update((p) => ({ collapsed: false, open: { ...p.open, [id]: true } }))

  const sectionBodies: Record<SectionId, ReactNode> = {
    scenario: <ScenarioControls onOpenEditor={onOpenEditor} />,
    device: (
      <div className="flex items-center gap-3">
        <ChannelSelector />
        <span className={`h-7 w-px ${TONES.violet.divider}`} aria-hidden="true" />
        <PhonePlatformSelector />
      </div>
    ),
    live: <LiveRcsControls />,
    debug: <DebugOptions />,
  }

  return (
    <aside
      className={`flex h-full flex-col transition-[width] duration-150 ${darkSurface.sidebar} ${darkSurface.text} ${
        !collapsible ? 'w-full' : rail ? 'w-14' : 'w-[300px]'
      }`}
      aria-label="Simulator controls"
    >
      {rail && (
        <div className="flex flex-col items-center gap-1 py-3">
          <RailButton icon={PanelLeftOpen} label="Expand controls" onClick={() => setCollapsed(false)} />
          <div className={`my-1 h-px w-8 ${darkSurface.divider}`} />
          {SECTIONS.map((section) => (
            <RailButton key={section.id} icon={section.icon} label={section.title} tone={section.tone.rail} onClick={() => expandTo(section.id)} />
          ))}
          <RailButton icon={Play} label="Playback" tone={PLAYBACK_TONE.rail} onClick={() => setCollapsed(false)} />
        </div>
      )}

      {/* Kept mounted while the rail is shown so inputs (phone number, token) keep their state. */}
      <div className={`${rail ? 'hidden' : 'flex'} min-h-0 flex-1 flex-col`}>
        <div className={`shrink-0 border-b p-4 ${darkSurface.border}`}>
          <img
            src={assetUrl('/im-flow-builder-logo.png')}
            alt="IM Flow Builder"
            className="block w-full rounded-lg bg-slate-700"
          />
        </div>
        {collapsible && (
          <div className={`flex shrink-0 items-center justify-between border-b px-4 py-2 ${darkSurface.border}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${darkSurface.muted}`}>Controls</span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse controls"
              title="Collapse to icons"
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${darkFocusRing}`}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        )}

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 py-3">
            {SECTIONS.map((section) => (
              <SidebarSection
                key={section.id}
                id={section.id}
                title={section.title}
                icon={section.icon}
                accent={section.accent}
                tone={section.tone}
                open={prefs.open[section.id]}
                onToggle={() => toggleSection(section.id)}
              >
                {sectionBodies[section.id]}
              </SidebarSection>
            ))}
          </div>
        </div>

        <div className={`shrink-0 border-t p-4 ${PLAYBACK_TONE.section}`}>
          <PlaybackControls />
        </div>
      </div>
    </aside>
  )
}

function SidebarSection({
  id,
  title,
  icon: Icon,
  accent,
  tone,
  open,
  onToggle,
  children,
}: {
  id: SectionId
  title: string
  icon: LucideIcon
  accent: Accent
  tone: SectionTone
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const panelId = `sidebar-section-${id}`
  return (
    <section className={`border-b-2 ${tone.section}`}>
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-slate-800 transition-colors ${tone.header} ${darkFocusRing}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`} aria-hidden="true" />
          <Icon size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
          <span className="flex-1 truncate">{title}</span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={panelId} className={`${open ? 'flex' : 'hidden'} flex-col gap-4 px-4 pt-4 pb-4`}>
        <HideSectionHeadingContext.Provider value={true}>{children}</HideSectionHeadingContext.Provider>
      </div>
    </section>
  )
}

const NEUTRAL_RAIL = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'

function RailButton({
  icon: Icon,
  label,
  tone = NEUTRAL_RAIL,
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors ${tone} ${darkFocusRing}`}
    >
      <Icon size={17} />
    </button>
  )
}
