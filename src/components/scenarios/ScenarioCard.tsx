import { Play, Copy, FileJson, FileText, Pencil, Trash2 } from 'lucide-react'

interface ScenarioCardProps {
  name: string
  description?: string
  badge: 'Built-in' | 'Custom'
  meta?: string
  onLoad: () => void
  onDuplicate: () => void
  onExportJson: () => void
  onExportYaml: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function ScenarioCard({
  name,
  description,
  badge,
  meta,
  onLoad,
  onDuplicate,
  onExportJson,
  onExportYaml,
  onEdit,
  onDelete,
}: ScenarioCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-slate-900 m-0 truncate">{name}</h3>
            <span
              className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${
                badge === 'Built-in' ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'
              }`}
            >
              {badge}
            </span>
          </div>
          {description && <p className="text-[12.5px] text-slate-500 mt-1 mb-0 line-clamp-2">{description}</p>}
          {meta && <p className="text-[11px] text-slate-400 mt-1 mb-0">{meta}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onLoad}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
        >
          <Play size={12.5} /> Load
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 cursor-pointer"
          >
            <Pencil size={12.5} /> Edit
          </button>
        )}
        <button
          type="button"
          onClick={onDuplicate}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
          title="Duplicate as a customizable copy"
        >
          <Copy size={12.5} /> Duplicate
        </button>
        <button
          type="button"
          onClick={onExportJson}
          aria-label="Export as JSON"
          title="Export as JSON"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 cursor-pointer"
        >
          <FileJson size={12.5} /> JSON
        </button>
        <button
          type="button"
          onClick={onExportYaml}
          aria-label="Export as YAML"
          title="Export as YAML"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 cursor-pointer"
        >
          <FileText size={12.5} /> YAML
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete scenario"
            title="Delete scenario"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer ml-auto"
          >
            <Trash2 size={12.5} />
          </button>
        )}
      </div>
    </div>
  )
}
