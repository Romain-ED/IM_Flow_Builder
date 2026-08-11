import type { ComponentType } from 'react'

type Variant = 'emerald' | 'indigo' | 'teal' | 'rose' | 'neutral'

const VARIANT_CLASSES: Record<Variant, string> = {
  emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100',
  teal: 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100',
  rose: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
  neutral: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
}

export function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  variant = 'neutral',
  disabled,
}: {
  icon: ComponentType<{ size?: number }>
  label: string
  onClick: () => void
  variant?: Variant
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]}`}
    >
      <Icon size={12.5} />
      {label}
    </button>
  )
}
