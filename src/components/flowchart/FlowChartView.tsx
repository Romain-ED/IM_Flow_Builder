import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChannelId, FlowDefinition } from '../../schema/flow'
import {
  CHART_CARD_WIDTH,
  WHATSAPP_CAROUSEL_CARD_WIDTH,
  buildChartNodeItems,
  type ChartNodeItems,
} from '../../engine/flowChartItems'
import { NODE_ANCHOR } from '../../engine/flowAnchors'
import { anchoredEdges, computeFlowGraphLayout, type AnchoredEdge } from '../../engine/flowGraph'
import { layoutFlowChart, type FlowChartLayout, type LayoutEdge, type LayoutNode, type LayoutPort } from '../../engine/flowChartLayout'
import { channelThemes } from '../../channels/theme'
import { FlowGraphLegend } from '../debug/FlowGraphView'
import { FlowChartCanvas } from './FlowChartCanvas'
import { ChartNodeBubbles, ChartNodeFrame } from './ChartNode'
import { chartFrameWidth } from './chartFrame'
import { ChartConnectors } from './ChartConnectors'
import { buildConnectorGeometry, edgeId, type Box } from './connectorGeometry'
import { MeasureChartNodes, type MeasuredNode } from './MeasureChartNodes'

const portId = (nodeId: string, anchor: string) => `${nodeId}::out::${anchor}`

/** Vertical center of a button inside its node, or the node's middle for a node-level edge. */
function portCenterY(nodeHeight: number, measured: MeasuredNode | undefined, anchor: string): number {
  const box = anchor === NODE_ANCHOR ? undefined : measured?.anchors[anchor]
  const y = box ? box.y + box.height / 2 : nodeHeight / 2
  return Math.min(Math.max(y, 0), nodeHeight)
}

/** One out port per distinct transition source inside a node. */
function outPorts(nodeId: string, edges: AnchoredEdge[], height: number, measured: MeasuredNode | undefined): LayoutPort[] {
  const anchors = [...new Set(edges.filter((edge) => edge.from === nodeId).map((edge) => edge.anchor))]
  return anchors.map((anchor) => ({ id: portId(nodeId, anchor), y: portCenterY(height, measured, anchor) }))
}

/** Flow chart for one scenario: every node drawn with its real message components, and an arrow per button. */
export function FlowChartView({ flow }: { flow: FlowDefinition }) {
  // A flow without a channel is drawn with RCS bubbles.
  const channel: ChannelId = flow.metadata.channel ?? 'rcs'
  const canAttach = channelThemes[channel].chipStyle === 'stacked'
  const carouselCardWidth = channel === 'rcs' ? CHART_CARD_WIDTH : WHATSAPP_CAROUSEL_CARD_WIDTH

  const graph = useMemo(() => computeFlowGraphLayout(flow), [flow])
  const itemsById = useMemo(
    () =>
      new Map<string, ChartNodeItems>(
        flow.nodes.map((node) => [node.id, buildChartNodeItems(node, canAttach, carouselCardWidth)]),
      ),
    [flow, canAttach, carouselCardWidth],
  )
  const edges = useMemo(() => {
    const placedIds = new Set(graph.nodes.map((node) => node.id))
    return flow.nodes.flatMap((node) => anchoredEdges(node)).filter((edge) => placedIds.has(edge.to))
  }, [flow, graph])

  const [measured, setMeasured] = useState<Record<string, MeasuredNode> | null>(null)
  const handleMeasure = useCallback(
    (next: Record<string, MeasuredNode>) =>
      setMeasured((previous) => (previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next)),
    [],
  )

  const [placement, setPlacement] = useState<FlowChartLayout | null>(null)
  const [layoutError, setLayoutError] = useState<string | null>(null)
  useEffect(() => {
    if (!measured) return
    const nodes: LayoutNode[] = graph.nodes.map((node) => {
      const height = measured[node.id]?.height ?? 0
      const width = chartFrameWidth(itemsById.get(node.id)?.contentWidth ?? 0)
      return { id: node.id, width, height, ports: outPorts(node.id, edges, height, measured[node.id]) }
    })
    const layoutEdges: LayoutEdge[] = edges.map((edge, index) => ({
      id: edgeId(index),
      fromPort: portId(edge.from, edge.anchor),
      to: edge.to,
    }))
    let current = true
    layoutFlowChart(nodes, layoutEdges)
      .then((result) => {
        if (!current) return
        setLayoutError(null)
        setPlacement(result)
      })
      .catch((error: unknown) => {
        if (current) setLayoutError(error instanceof Error ? error.message : 'Layout failed.')
      })
    return () => {
      current = false
    }
  }, [edges, graph, itemsById, measured])

  const connectors = useMemo(() => {
    if (!placement || !measured) return []
    const placed = new Map<string, Box>(
      graph.nodes.map((node) => {
        const at = placement.nodes[node.id]
        const width = chartFrameWidth(itemsById.get(node.id)?.contentWidth ?? 0)
        return [node.id, { x: at?.x ?? 0, y: at?.y ?? 0, width, height: measured[node.id]?.height ?? 0 }]
      }),
    )
    const anchorsByNode = Object.fromEntries(Object.entries(measured).map(([id, box]) => [id, box.anchors]))
    return buildConnectorGeometry(edges, placement.edges, placed, anchorsByNode)
  }, [edges, graph, itemsById, measured, placement])

  return (
    <>
      <MeasureChartNodes nodes={graph.nodes} itemsById={itemsById} channel={channel} onMeasure={handleMeasure} />
      {placement ? (
        <>
          <FlowChartCanvas
            contentWidth={placement.width}
            contentHeight={placement.height}
            initialFocus={placement.nodes[flow.start]}
          >
            <div className="relative" style={{ width: placement.width, height: placement.height }}>
              {graph.nodes.map((node) => {
                const at = placement.nodes[node.id]
                const items = itemsById.get(node.id)
                if (!at || !items) return null
                const width = chartFrameWidth(items.contentWidth)
                return (
                  <div key={node.id} className="absolute" style={{ left: at.x, top: at.y, width }}>
                    <ChartNodeFrame node={node} width={width} dimmed={node.kind === 'unreached'}>
                      <ChartNodeBubbles items={items} channel={channel} />
                    </ChartNodeFrame>
                  </div>
                )
              })}
              <ChartConnectors connectors={connectors} width={placement.width} height={placement.height} />
            </div>
          </FlowChartCanvas>
          <FlowGraphLegend />
        </>
      ) : layoutError ? (
        <p role="alert" className="m-0 text-[13px] text-rose-700">
          Could not lay out this flow: {layoutError}
        </p>
      ) : (
        <p role="status" className="m-0 text-[13px] text-slate-500">
          Laying out the flow…
        </p>
      )}
    </>
  )
}
