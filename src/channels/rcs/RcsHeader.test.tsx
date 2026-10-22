import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { RcsHeader } from './RcsHeader'

describe('RcsHeader', () => {
  afterEach(() => cleanup())
  it('uses a neutral fallback profile and omits RCS call controls', () => {
    render(<RcsHeader brand={{ name: 'Northwind Store' }} onBrandClick={vi.fn()} />)
    expect(screen.getByText('Northwind Store')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start video call' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Call business' })).not.toBeInTheDocument()
  })

  it('uses neutral navigation fallback copy for V Bank conversations', () => {
    const showToast = vi.fn()
    useSimulatorStore.setState({ showToast })
    render(<RcsHeader brand={{ name: 'V Bank', description: 'Personal banking and lending' }} onBrandClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'More conversation options' }))
    expect(showToast).toHaveBeenNthCalledWith(1, 'Back navigation is unavailable.')
    expect(showToast).toHaveBeenNthCalledWith(2, 'More conversation options are unavailable.')
    expect(showToast.mock.calls.join(' ')).not.toContain('demo')
  })
})
