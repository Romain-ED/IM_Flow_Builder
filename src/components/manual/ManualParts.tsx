import type { ReactNode } from 'react'
import { ArrowDown } from 'lucide-react'
import { MANUAL } from './manualContent'

const SECTION_ACCENTS = {
  indigo: 'text-indigo-600',
  violet: 'text-violet-600',
  emerald: 'text-emerald-600',
  teal: 'text-teal-600',
  rose: 'text-rose-600',
  amber: 'text-amber-600',
} as const

export function Section({
  id,
  title,
  accent,
  children,
}: {
  id: string
  title: string
  accent: keyof typeof SECTION_ACCENTS
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className={`text-[15px] font-semibold m-0 mb-3 ${SECTION_ACCENTS[accent]}`}>{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-slate-600 m-0">{children}</p>
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 rounded-lg p-3.5 text-[11.5px] leading-relaxed overflow-x-auto thin-scrollbar m-0">
      <code>{children}</code>
    </pre>
  )
}

export function ParamTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {rows.map(([term, desc], i) => (
        <div
          key={term}
          className={`flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''} ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
        >
          <code className="text-[12px] font-semibold text-slate-800 shrink-0 sm:w-40 break-words">{term}</code>
          <span className="text-[12.5px] text-slate-600 leading-relaxed">{desc}</span>
        </div>
      ))}
    </div>
  )
}

export function PlatformLimitsTable() {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden overflow-x-auto thin-scrollbar">
      <table className="w-full text-[12px] border-collapse min-w-[420px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left font-semibold text-slate-500 px-3 py-2">Limit</th>
            <th className="text-left font-semibold text-slate-500 px-3 py-2">WhatsApp</th>
            <th className="text-left font-semibold text-slate-500 px-3 py-2">RCS</th>
          </tr>
        </thead>
        <tbody>
          {MANUAL.platformLimits.map(([limit, wa, rcs], i) => (
            <tr key={limit} className={`${i > 0 ? 'border-t border-slate-100' : ''} ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
              <td className="px-3 py-2 text-slate-700">{limit}</td>
              <td className="px-3 py-2 text-slate-600">{wa}</td>
              <td className="px-3 py-2 text-slate-600">{rcs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ArchitectureDiagram() {
  const layers = MANUAL.architectureLayers
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {layers.map((layer, i) => (
        <div key={layer.label} className="flex flex-col items-center gap-1">
          <div className={`${layer.accent} text-white text-[12.5px] font-medium rounded-lg px-4 py-2 text-center shadow-sm`}>
            {layer.label}
          </div>
          {i < layers.length - 1 && <ArrowDown size={16} className="text-slate-300" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
