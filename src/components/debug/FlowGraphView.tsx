import { GRAPH_NODE_WIDTH, GRAPH_NODE_HEIGHT, type FlowGraphLayout, type GraphNode } from '../../engine/flowGraph'

interface FlowGraphViewProps {
  layout: FlowGraphLayout
  currentNodeId?: string | null
  interactive: boolean
  onNodeClick?: (nodeId: string) => void
  /** CSS max-height for the scrollable canvas, e.g. "18rem". Defaults to unconstrained. */
  maxHeight?: string
}

const KIND_STYLES: Record<GraphNode['kind'], string> = {
  normal: 'bg-white border-slate-300 text-slate-800',
  condition: 'bg-amber-50 border-amber-300 text-amber-900',
  terminal: 'bg-slate-800 border-slate-800 text-white',
  unreached: 'bg-white border-slate-200 text-slate-400 border-dashed',
}

const EDGE_COLOR: Record<string, string> = {
  flow: '#94a3b8',
  'condition-then': '#059669',
  'condition-else': '#dc2626',
}

function edgePath(from: GraphNode, to: GraphNode): string {
  const x1 = from.x + GRAPH_NODE_WIDTH
  const y1 = from.y + GRAPH_NODE_HEIGHT / 2
  const x2 = to.x
  const y2 = to.y + GRAPH_NODE_HEIGHT / 2
  const dx = Math.max(40, Math.abs(x2 - x1) / 2)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

export function FlowGraphView({ layout, currentNodeId, interactive, onNodeClick, maxHeight }: FlowGraphViewProps) {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]))

  return (
    <div
      className="overflow-auto thin-scrollbar rounded-lg border border-slate-200 bg-slate-50"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className="relative" style={{ width: layout.width, height: layout.height, minWidth: '100%' }}>
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          {layout.edges.map((edge, i) => {
            const from = byId.get(edge.from)
            const to = byId.get(edge.to)
            if (!from || !to) return null
            return (
              <path
                key={i}
                d={edgePath(from, to)}
                fill="none"
                stroke={EDGE_COLOR[edge.kind]}
                strokeWidth={1.5}
                markerEnd="url(#graph-arrow)"
              />
            )
          })}
          <defs>
            <marker id="graph-arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {layout.nodes.map((node) => {
          const isCurrent = node.id === currentNodeId
          return (
            <button
              key={node.id}
              type="button"
              disabled={!interactive}
              tabIndex={interactive ? 0 : -1}
              onClick={interactive && onNodeClick ? () => onNodeClick(node.id) : undefined}
              className={`absolute flex flex-col items-start justify-center rounded-lg border px-2.5 py-1.5 text-left transition-shadow ${KIND_STYLES[node.kind]} ${
                interactive ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
              } ${node.isStart ? 'ring-2 ring-indigo-500 ring-offset-1' : ''} ${
                isCurrent ? 'ring-2 ring-teal-500 ring-offset-1' : ''
              }`}
              style={{ left: node.x, top: node.y, width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT }}
              title={node.id}
            >
              <span className="text-[11.5px] font-semibold font-mono truncate w-full">{node.id}</span>
              {node.label && <span className="text-[10.5px] opacity-70 truncate w-full">{node.label}</span>}
              {node.isStart && (
                <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-600">start</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function FlowGraphLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
      <LegendSwatch className="bg-white border-slate-300" label="Node" />
      <LegendSwatch className="bg-amber-50 border-amber-300" label="Condition" />
      <LegendSwatch className="bg-slate-800 border-slate-800" label="End" />
      <LegendSwatch className="bg-white border-slate-200 border-dashed" label="Unreached" />
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded border-2 border-indigo-500" /> Start
      </span>
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded border-2 border-teal-500" /> Current
      </span>
    </div>
  )
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-3 w-3 rounded border ${className}`} />
      {label}
    </span>
  )
}
