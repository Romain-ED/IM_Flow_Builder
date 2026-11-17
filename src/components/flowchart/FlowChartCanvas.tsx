import type { ReactNode } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'

interface FlowChartCanvasProps {
  /** Width and height of the chart content in CSS pixels, before zoom. */
  contentWidth: number
  contentHeight: number
  /** Content point to show at the top-left corner when the chart opens and on reset. */
  initialFocus?: { x: number; y: number }
  children: ReactNode
}

const FOCUS_MARGIN = 32

/**
 * Zoomable, pannable surface for the flow chart. Zoom and pan change only the
 * CSS transform of the content, so the chart is not re-rendered or re-measured
 * while the user moves around.
 */
export function FlowChartCanvas({ contentWidth, contentHeight, initialFocus, children }: FlowChartCanvasProps) {
  return (
    <TransformWrapper
      initialScale={1}
      initialPositionX={initialFocus ? -(initialFocus.x - FOCUS_MARGIN) : 0}
      initialPositionY={initialFocus ? -(initialFocus.y - FOCUS_MARGIN) : 0}
      minScale={0.2}
      maxScale={3}
      limitToBounds={false}
      doubleClick={{ disabled: true }}
      smooth={false}
      wheel={{ step: 0.1 }}
    >
      {({ resetTransform }) => (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-3 text-[12px] text-slate-500">
            <button
              type="button"
              onClick={() => resetTransform()}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Reset view
            </button>
            <span>Scroll or pinch to zoom, drag to pan.</span>
          </div>
          <TransformComponent
            wrapperClass="min-h-0 flex-1 w-full rounded-lg border border-slate-200 bg-slate-50"
            contentStyle={{ width: contentWidth, height: contentHeight }}
          >
            {children}
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  )
}
