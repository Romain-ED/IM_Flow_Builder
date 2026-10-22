import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { RcsHeader } from './RcsHeader'

describe('RcsHeader', () => {
  it('uses neutral navigation fallback copy for V Bank conversations', () => {
    const showToast = vi.fn()
    useSimulatorStore.setState({ showToast })

    render(
      <RcsHeader
        brand={{ name: 'V Bank', description: 'Personal banking and lending' }}
        onBrandClick={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'More conversation options' }))

    expect(showToast).toHaveBeenNthCalledWith(1, 'Back navigation is unavailable.')
    expect(showToast).toHaveBeenNthCalledWith(2, 'More conversation options are unavailable.')
    expect(showToast.mock.calls.join(' ')).not.toContain('demo')
  })
})
