import { useMemo, useState, type ReactNode } from 'react'
import { List, Waypoints } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { computeFlowGraphLayout } from '../../engine/flowGraph'
import { FlowGraphView, FlowGraphLegend } from './FlowGraphView'

export function DebugDrawer() {
  const flow = useSimulatorStore((s) => s.flow)
  const currentNodeId = useSimulatorStore((s) => s.currentNodeId)
  const variables = useSimulatorStore((s) => s.variables)
  const visitedNodeIds = useSimulatorStore((s) => s.visitedNodeIds)
  const validation = useSimulatorStore((s) => s.validation)
  const events = useSimulatorStore((s) => s.events)
  const jumpToNode = useSimulatorStore((s) => s.jumpToNode)
  const [nodesView, setNodesView] = useState<'list' | 'graph'>('graph')

  const layout = useMemo(() => (flow ? computeFlowGraphLayout(flow) : null), [flow])

  return (
    <aside className="flex flex-col h-full overflow-y-auto thin-scrollbar p-4 gap-5 text-[12.5px]">
      <Section title="Current node">
        {currentNodeId ? (
          <code className="block bg-slate-900 text-slate-100 rounded-lg px-2.5 py-2 text-[12px] break-all">
            {currentNodeId}
          </code>
        ) : (
          <p className="text-slate-400 m-0">—</p>
        )}
      </Section>

      <Section title="Variables">
        <dl className="flex flex-col gap-1">
          {Object.entries(variables).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <dt className="text-slate-500 truncate">{key}</dt>
              <dd className="m-0 font-mono text-slate-800 truncate">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={`History (${visitedNodeIds.length})`}>
        <ol className="flex flex-col gap-1 list-none m-0 p-0">
          {visitedNodeIds.map((nodeId, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => jumpToNode(nodeId)}
                className={`w-full text-left rounded-md px-2 py-1 font-mono text-[11.5px] truncate cursor-pointer hover:bg-slate-100 ${
                  nodeId === currentNodeId ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-600'
                }`}
              >
                {i + 1}. {nodeId}
              </button>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Flow graph"
        action={
          <div className="flex rounded-md border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setNodesView('list')}
              aria-pressed={nodesView === 'list'}
              className={`flex items-center gap-1 px-1.5 py-1 text-[10.5px] font-medium cursor-pointer ${nodesView === 'list' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <List size={11} /> List
            </button>
            <button
              type="button"
              onClick={() => setNodesView('graph')}
              aria-pressed={nodesView === 'graph'}
              className={`flex items-center gap-1 px-1.5 py-1 text-[10.5px] font-medium cursor-pointer ${nodesView === 'graph' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <Waypoints size={11} /> Graph
            </button>
          </div>
        }
      >
        {nodesView === 'list' ? (
          <div className="flex flex-wrap gap-1">
            {flow?.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => jumpToNode(node.id)}
                title={node.label ?? node.id}
                className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-mono text-slate-600 hover:bg-slate-100 cursor-pointer truncate max-w-[9rem]"
              >
                {node.id}
              </button>
            ))}
          </div>
        ) : (
          layout && (
            <div className="flex flex-col gap-2">
              <FlowGraphView
                layout={layout}
                currentNodeId={currentNodeId}
                interactive
                onNodeClick={jumpToNode}
                maxHeight="18rem"
              />
              <FlowGraphLegend />
            </div>
          )
        )}
      </Section>

      {validation && !validation.success && (
        <Section title="Validation errors">
          <div className="flex flex-col gap-1.5">
            {validation.errors.map((error, i) => (
              <p key={i} className="text-rose-700 bg-rose-50 rounded-md px-2 py-1.5 m-0">
                {error.message}
              </p>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Event log (${events.length})`}>
        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto thin-scrollbar">
          {events
            .slice(-40)
            .reverse()
            .map((event, i) => (
              <div key={i} className="font-mono text-[11px] text-slate-500 border-b border-slate-50 pb-1">
                <span className="text-slate-400">{new Date(event.at).toLocaleTimeString()}</span>{' '}
                <span className="text-slate-700">{event.type}</span>
                {'nodeId' in event && event.nodeId && <span> · {event.nodeId}</span>}
                {'variable' in event && <span> · {event.variable}</span>}
                {'to' in event && <span> → {event.to}</span>}
              </div>
            ))}
        </div>
      </Section>
    </aside>
  )
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 m-0">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
