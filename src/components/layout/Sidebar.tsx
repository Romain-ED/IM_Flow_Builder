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
import { darkFocusRing, darkSurface } from '../../utils/darkChrome'

type SectionId = 'scenario' | 'device' | 'live' | 'debug'

interface SidebarPrefs {
  collapsed: boolean
  open: Record<SectionId, boolean>
}

const STORAGE_KEY = 'imfb.sidebar.v1'

const SECTIONS: { id: SectionId; title: string; icon: LucideIcon }[] = [
  { id: 'scenario', title: 'Scenario', icon: FileText },
  { id: 'device', title: 'Channel & device', icon: Smartphone },
  { id: 'live', title: 'Live RCS', icon: Radio },
  { id: 'debug', title: 'Debug', icon: Bug },
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
        <span className={`h-9 w-px ${darkSurface.divider}`} aria-hidden="true" />
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
            <RailButton key={section.id} icon={section.icon} label={section.title} onClick={() => expandTo(section.id)} />
          ))}
          <RailButton icon={Play} label="Playback" onClick={() => setCollapsed(false)} />
        </div>
      )}

      {/* Kept mounted while the rail is shown so inputs (phone number, token) keep their state. */}
      <div className={`${rail ? 'hidden' : 'flex'} min-h-0 flex-1 flex-col`}>
        {collapsible && (
          <div className={`flex shrink-0 items-center justify-between border-b px-4 py-2.5 ${darkSurface.border}`}>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">Controls</span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse controls"
              title="Collapse to icons"
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white ${darkFocusRing}`}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        )}

        <div className="thin-scrollbar-dark min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1 p-2">
            {SECTIONS.map((section) => (
              <SidebarSection
                key={section.id}
                id={section.id}
                title={section.title}
                icon={section.icon}
                open={prefs.open[section.id]}
                onToggle={() => toggleSection(section.id)}
              >
                {sectionBodies[section.id]}
              </SidebarSection>
            ))}
          </div>
        </div>

        <div className={`shrink-0 border-t bg-zinc-950/40 p-4 ${darkSurface.border}`}>
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
  open,
  onToggle,
  children,
}: {
  id: SectionId
  title: string
  icon: LucideIcon
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const panelId = `sidebar-section-${id}`
  return (
    <section className={`rounded-xl border transition-colors ${open ? 'border-white/[0.06] bg-white/[0.025]' : 'border-transparent'}`}>
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-white/[0.04] ${
            open ? 'text-white' : 'text-zinc-300 hover:text-white'
          } ${darkFocusRing}`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
              open ? 'bg-indigo-500/15 text-indigo-300' : 'bg-white/[0.04] text-zinc-400 group-hover:text-zinc-200'
            }`}
            aria-hidden="true"
          >
            <Icon size={14} />
          </span>
          <span className="flex-1 truncate">{title}</span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={panelId} className={`${open ? 'flex' : 'hidden'} flex-col gap-4 px-3 pt-1 pb-3.5`}>
        <HideSectionHeadingContext.Provider value={true}>{children}</HideSectionHeadingContext.Provider>
      </div>
    </section>
  )
}

const NEUTRAL_RAIL = 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'

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
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors ${tone} ${darkFocusRing}`}
    >
      <Icon size={17} />
    </button>
  )
}
