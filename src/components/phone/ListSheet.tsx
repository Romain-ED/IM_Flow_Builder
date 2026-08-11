import { X } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'

export function ListSheet() {
  const activeListSheet = useSimulatorStore((s) => s.activeListSheet)
  const closeListSheet = useSimulatorStore((s) => s.closeListSheet)
  const handleListRowSelect = useSimulatorStore((s) => s.handleListRowSelect)

  if (!activeListSheet || activeListSheet.message.type !== 'list') return null
  const { title, sections } = activeListSheet.message

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close list"
        className="absolute inset-0 bg-black/40"
        onClick={closeListSheet}
      />
      <div className="relative bg-white rounded-t-2xl max-h-[75%] flex flex-col shadow-xl animate-message-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <h3 className="text-[15px] font-semibold text-slate-900 m-0">{title}</h3>
          <button
            type="button"
            onClick={closeListSheet}
            aria-label="Close"
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto thin-scrollbar px-2 py-2">
          {sections.map((section, si) => (
            <div key={si} className="mb-2">
              {section.title && (
                <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.title}
                </div>
              )}
              {section.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleListRowSelect(row)}
                  className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="block text-[14px] font-medium text-slate-900">{row.title}</span>
                  {row.description && (
                    <span className="block text-[12.5px] text-slate-500">{row.description}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
