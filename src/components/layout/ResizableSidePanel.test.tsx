import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ResizableSidePanel } from './ResizableSidePanel'

function setup({ width = 320, minWidth = 240, maxWidth = 600 } = {}) {
  const onWidthChange = vi.fn()
  render(
    <ResizableSidePanel
      width={width}
      onWidthChange={onWidthChange}
      minWidth={minWidth}
      getMaxWidth={() => maxWidth}
      label="Resize panel"
    >
      <p>Panel body</p>
    </ResizableSidePanel>,
  )
  return { onWidthChange, handle: screen.getByRole('separator', { name: 'Resize panel' }) }
}

function dispatchPointer(type: 'pointerdown' | 'pointermove' | 'pointerup', target: Element, clientX = 0) {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, button: 0 }))
}

describe('ResizableSidePanel', () => {
  beforeEach(() => {
    // jsdom does not implement pointer capture.
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { value: vi.fn(), configurable: true })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('exposes the current width to assistive tech and renders its content', () => {
    const { handle } = setup({ width: 320 })
    expect(handle.getAttribute('aria-valuenow')).toBe('320')
    expect(handle.getAttribute('aria-valuemin')).toBe('240')
    expect(screen.getByText('Panel body')).toBeTruthy()
  })

  it('widens on ArrowLeft and stops at the maximum', () => {
    const { onWidthChange, handle } = setup({ width: 320, maxWidth: 330 })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(onWidthChange).toHaveBeenLastCalledWith(330)
  })

  it('narrows on ArrowRight and stops at the minimum', () => {
    const { onWidthChange, handle } = setup({ width: 245, minWidth: 240 })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(onWidthChange).toHaveBeenLastCalledWith(240)
  })

  it('ignores other keys', () => {
    const { onWidthChange, handle } = setup()
    fireEvent.keyDown(handle, { key: 'Enter' })
    expect(onWidthChange).not.toHaveBeenCalled()
  })

  it('widens when dragged left and clamps to the maximum', () => {
    const { onWidthChange, handle } = setup({ width: 320, maxWidth: 600 })
    dispatchPointer('pointerdown', handle, 800)
    dispatchPointer('pointermove', handle, 700)
    expect(onWidthChange).toHaveBeenLastCalledWith(420)
    dispatchPointer('pointermove', handle, 100)
    expect(onWidthChange).toHaveBeenLastCalledWith(600)
  })

  it('narrows when dragged right and stops following the pointer after release', () => {
    const { onWidthChange, handle } = setup({ width: 320, minWidth: 240 })
    dispatchPointer('pointerdown', handle, 800)
    dispatchPointer('pointermove', handle, 900)
    expect(onWidthChange).toHaveBeenLastCalledWith(240)
    dispatchPointer('pointerup', handle, 900)
    onWidthChange.mockClear()
    dispatchPointer('pointermove', handle, 600)
    expect(onWidthChange).not.toHaveBeenCalled()
  })
})
