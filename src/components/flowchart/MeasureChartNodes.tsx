import { useLayoutEffect, useRef } from 'react'
import type { ChannelId } from '../../schema/flow'
import type { GraphNode } from '../../engine/flowGraph'
import type { ChartNodeItems } from '../../engine/flowChartItems'
import { ChartNodeBubbles, ChartNodeFrame } from './ChartNode'
import { chartFrameWidth } from './chartFrame'
import type { Box } from './connectorGeometry'

/** Rendered size of one node, plus the box of each of its buttons relative to the node's top-left. */
export interface MeasuredNode {
  height: number
  anchors: Record<string, Box>
}

interface MeasureChartNodesProps {
  nodes: GraphNode[]
  itemsById: Map<string, ChartNodeItems>
  channel: ChannelId
  onMeasure: (measured: Record<string, MeasuredNode>) => void
}

/**
 * Hidden copy of every node, drawn at the same width the chart uses, so the real
 * components can report their rendered sizes before the chart is placed. It stays
 * mounted so a font load or image size change re-measures.
 */
export function MeasureChartNodes({ nodes, itemsById, channel, onMeasure }: MeasureChartNodesProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measureAll = () => {
      const measured: Record<string, MeasuredNode> = {}
      root.querySelectorAll<HTMLElement>('[data-measure-node]').forEach((element) => {
        const nodeId = element.dataset.measureNode ?? ''
        const origin = element.getBoundingClientRect()
        const anchors: Record<string, Box> = {}
        element.querySelectorAll<HTMLElement>('[data-chart-anchor]').forEach((button) => {
          const anchorId = button.dataset.chartAnchor ?? ''
          const box = button.getBoundingClientRect()
          anchors[anchorId] = {
            x: box.left - origin.left,
            y: box.top - origin.top,
            width: box.width,
            height: box.height,
          }
        })
        measured[nodeId] = { height: origin.height, anchors }
      })
      onMeasure(measured)
    }
    measureAll()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measureAll)
    root.querySelectorAll('[data-measure-node]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [nodes, itemsById, channel, onMeasure])

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none invisible fixed left-0 top-0">
      {nodes.map((node) => {
        const items = itemsById.get(node.id)
        if (!items) return null
        const width = chartFrameWidth(items.contentWidth)
        return (
          <div key={node.id} data-measure-node={node.id} style={{ width }}>
            <ChartNodeFrame node={node} width={width}>
              <ChartNodeBubbles items={items} channel={channel} />
            </ChartNodeFrame>
          </div>
        )
      })}
    </div>
  )
}
