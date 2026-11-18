import { useSimulatorStore } from '../../store/simulatorStore'
import { LiveLogsView } from '../live/LiveLogsView'

/**
 * Right-side RCS message log for the current live session. It reuses the Live RCS logs
 * view, so it shows the same webhook and delivery timeline. It keeps the last session
 * after a stop and clears on reset.
 */
export function RcsMessagesPanel() {
  const liveSessionId = useSimulatorStore((s) => s.liveSessionId)

  return (
    <aside className="flex flex-col h-full min-w-0 overflow-y-auto overflow-x-hidden thin-scrollbar p-4 gap-4 text-[12.5px]">
      <header className="flex flex-col gap-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 m-0">RCS messages</h2>
        <p className="m-0 text-[11.5px] leading-5 text-slate-500">Webhook and delivery timeline for the live RCS session.</p>
      </header>
      {liveSessionId ? (
        <LiveLogsView sessionId={liveSessionId} compact />
      ) : (
        <p className="m-0 rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-500">
          No live RCS session yet. Start one from the Live RCS section and its messages appear here.
        </p>
      )}
    </aside>
  )
}
