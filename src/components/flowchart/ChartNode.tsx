import type { ReactNode } from 'react'
import type { ChannelId } from '../../schema/flow'
import { CHART_BUBBLE_WIDTH, type ChartNodeItems, type ChartTrailingItem } from '../../engine/flowChartItems'
import type { TrailingActionItem } from '../phone/MessageShell'
import { ChannelProvider } from '../../app/ChannelContext'
import { ChartMessageIndexContext } from '../../messages/chartAnchorContext'
import { MessageRenderer } from '../../messages/MessageRenderer'
import { ChoiceChips } from '../phone/ChoiceChips'

export interface ChartNodeHeader {
  id: string
  label: string
  isStart: boolean
}

/** Box around one node: its id and label, then whatever content the node draws. */
export function ChartNodeFrame({
  node,
  width,
  dimmed = false,
  children,
}: {
  node: ChartNodeHeader
  width: number
  /** Unreachable from the start node. Drawn faded. */
  dimmed?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-xl border border-slate-300 bg-slate-100 p-2.5 ${dimmed ? 'opacity-50' : ''}`}
      style={{ width }}
    >
      <div className="flex min-w-0 items-center gap-2 px-0.5">
        <span className="truncate font-mono text-[11.5px] font-semibold text-slate-700">{node.id}</span>
        {node.label && <span className="truncate text-[11px] text-slate-500">{node.label}</span>}
        {node.isStart && (
          <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wide text-indigo-600">start</span>
        )}
      </div>
      {children}
    </div>
  )
}

const noop = () => {}

function toTrailingItems(items: ChartTrailingItem[]): TrailingActionItem[] {
  return items.map((item) => ({ key: item.anchor, label: item.label, onClick: noop, anchor: item.anchor }))
}

interface ChartNodeBubblesProps {
  items: ChartNodeItems
  channel: ChannelId
}

/**
 * The real message components for one node, in the channel's own style. The
 * column is always `CHART_BUBBLE_WIDTH` wide. A carousel strip can extend past
 * it, inside the node frame. The stack is `inert`, so nothing in it can be
 * clicked, focused, or run. Clicks reach the chart's zoom and pan layer instead.
 */
export function ChartNodeBubbles({ items, channel }: ChartNodeBubblesProps) {
  return (
    <ChannelProvider channel={channel}>
      <div
        inert
        className="pointer-events-none flex flex-col gap-2.5"
        style={{ width: CHART_BUBBLE_WIDTH }}
      >
        {items.condition && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-amber-700">Branch if</span>
            <span className="font-mono">{items.condition}</span>
          </div>
        )}
        {items.bubbles.length === 0 && items.floating.length === 0 && !items.condition && (
          <p className="m-0 py-2 text-center text-[12px] text-slate-400">No messages in this step</p>
        )}
        {items.bubbles.map((bubble) => (
          <ChartMessageIndexContext.Provider key={bubble.message.runtimeId} value={bubble.messageIndex}>
            <MessageRenderer
              message={bubble.message}
              channel={channel}
              previewOnly
              trailingActions={bubble.attached.length > 0 ? toTrailingItems(bubble.attached) : undefined}
            />
          </ChartMessageIndexContext.Provider>
        ))}
        {items.floating.length > 0 && (
          <div className="flex w-full justify-end pr-1">
            <ChoiceChips
              choices={items.floating.map((item) => ({ label: item.label }))}
              channel={channel}
              interactive
              onSelect={noop}
              anchors={items.floating.map((item) => item.anchor)}
            />
          </div>
        )}
      </div>
    </ChannelProvider>
  )
}
