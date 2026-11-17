import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { NormalizedMessage } from '../engine/types'
import { formatTime } from '../utils/time'
import { MessageRenderer } from './MessageRenderer'

const timestamp = Date.UTC(2026, 10, 17, 9, 30)
const message: NormalizedMessage = {
  runtimeId: 'n:0',
  nodeId: 'n',
  timestamp,
  message: { type: 'text', text: 'Hello there', sender: 'business' },
}
const trailing = [{ key: 'yes', label: 'Yes please', onClick: vi.fn() }]

describe('MessageRenderer previewOnly', () => {
  afterEach(() => cleanup())

  it('shows trailing buttons in the chart preview', () => {
    render(<MessageRenderer message={message} channel="whatsapp" previewOnly trailingActions={trailing} />)

    expect(screen.getByText('Yes please')).toBeInTheDocument()
  })

  it('still hides trailing buttons in the live mirror', () => {
    render(<MessageRenderer message={message} channel="whatsapp" readOnly trailingActions={trailing} />)

    expect(screen.queryByText('Yes please')).not.toBeInTheDocument()
  })

  it('omits the timestamp in the chart preview but keeps it in the live mirror', () => {
    const timeLabel = formatTime(timestamp, undefined)
    const { unmount } = render(<MessageRenderer message={message} channel="whatsapp" readOnly />)
    expect(screen.getByText(timeLabel)).toBeInTheDocument()
    unmount()

    render(<MessageRenderer message={message} channel="whatsapp" previewOnly />)
    expect(screen.queryByText(timeLabel)).not.toBeInTheDocument()
  })

  it('puts the flow chart anchor on each trailing button', () => {
    const anchored = [{ key: 'message-1-option-0', label: 'Yes', onClick: vi.fn(), anchor: 'message-1-option-0' }]
    render(<MessageRenderer message={message} channel="whatsapp" previewOnly trailingActions={anchored} />)

    expect(screen.getByText('Yes').closest('button')).toHaveAttribute('data-chart-anchor', 'message-1-option-0')
  })

  it('renders no anchor attribute on the phone', () => {
    render(<MessageRenderer message={message} channel="whatsapp" trailingActions={trailing} />)

    expect(screen.getByText('Yes please').closest('button')).not.toHaveAttribute('data-chart-anchor')
  })
})
