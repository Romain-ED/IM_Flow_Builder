import type { ConnectorGeometry } from './connectorGeometry'

const STROKE: Record<ConnectorGeometry['kind'], string> = {
  flow: '#6366f1',
  'condition-then': '#059669',
  'condition-else': '#dc2626',
}

interface ChartConnectorsProps {
  connectors: ConnectorGeometry[]
  width: number
  height: number
}

/** Arrows over the nodes. The overlay ignores the pointer, so zoom and pan still reach the canvas. */
export function ChartConnectors({ connectors, width, height }: ChartConnectorsProps) {
  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="chart-arrowhead"
          markerWidth={8}
          markerHeight={8}
          refX={7}
          refY={4}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
        </marker>
      </defs>
      {connectors.map((connector) => (
        <g key={connector.key}>
          <path
            data-chart-edge={connector.key}
            d={connector.d}
            fill="none"
            stroke={STROKE[connector.kind]}
            strokeWidth={1.75}
            markerEnd="url(#chart-arrowhead)"
          />
          {connector.label && (
            <text
              x={connector.labelX}
              y={connector.labelY}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="#334155"
              stroke="#f8fafc"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {connector.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
