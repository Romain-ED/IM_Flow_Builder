import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

const KEYBOARD_STEP = 16

interface ResizableSidePanelProps {
  width: number
  onWidthChange: (width: number) => void
  minWidth: number
  /** Read when a drag or key press starts, so the limit tracks the current window and sidebar size. */
  getMaxWidth: () => number
  label: string
  children: ReactNode
}

/**
 * Desktop right-hand panel with a drag handle on its left edge. Dragging left widens the
 * panel. Arrow keys resize it when the handle has focus.
 */
export function ResizableSidePanel({ width, onWidthChange, minWidth, getMaxWidth, label, children }: ResizableSidePanelProps) {
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startWidth: number; maxWidth: number } | null>(null)

  // Restore the body styles set during a drag if the panel unmounts mid-drag.
  useEffect(() => () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const clamp = (value: number, maxWidth: number) => Math.round(Math.min(maxWidth, Math.max(minWidth, value)))

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startWidth: width, maxWidth: getMaxWidth() }
    setDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current) return
    onWidthChange(clamp(current.startWidth + current.startX - event.clientX, current.maxWidth))
  }

  function stopDrag() {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowLeft' ? KEYBOARD_STEP : -KEYBOARD_STEP
    onWidthChange(clamp(width + delta, getMaxWidth()))
  }

  return (
    // The handle sits on the border line. Panel content (h-full) stretches as before.
    <div className="hidden lg:block relative shrink-0 border-l border-slate-200 bg-white" style={{ width }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={width}
        aria-valuemin={minWidth}
        tabIndex={0}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
        onKeyDown={handleKeyDown}
        className={`absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none outline-none transition-colors hover:bg-indigo-300/50 focus-visible:bg-indigo-300/60 ${dragging ? 'bg-indigo-400/60' : ''}`}
      />
      {children}
    </div>
  )
}
