import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { NormalizedMessage } from '../engine/types'
import { ChartMessageIndexContext } from './chartAnchorContext'
import { ListMessage } from './ListMessage'

const list: NormalizedMessage = {
  runtimeId: 'menu:4',
  nodeId: 'menu',
  timestamp: 0,
  message: {
    type: 'list',
    sender: 'business',
    title: 'Plans',
    buttonLabel: 'View plans',
    sections: [
      { title: 'Prepaid', rows: [{ id: 'basic', title: 'Basic', next: 'basic_flow' }] },
      { rows: [{ id: 'pro', title: 'Pro' }, { id: 'max', title: 'Max', description: 'Everything' }] },
    ],
  },
}

describe('ListMessage in the flow chart', () => {
  afterEach(() => cleanup())

  it('draws every row inside the bubble with its message-level anchor, numbered across sections', () => {
    render(
      <ChartMessageIndexContext.Provider value={4}>
        <ListMessage message={list} channel="whatsapp" interactive />
      </ChartMessageIndexContext.Provider>,
    )

    expect(screen.getByText('Basic').closest('button')).toHaveAttribute('data-chart-anchor', 'message-4-row-0')
    expect(screen.getByText('Pro').closest('button')).toHaveAttribute('data-chart-anchor', 'message-4-row-1')
    expect(screen.getByText('Max').closest('button')).toHaveAttribute('data-chart-anchor', 'message-4-row-2')
    expect(screen.getByText('Prepaid')).toBeInTheDocument()
    expect(screen.queryByText('View plans')).not.toBeInTheDocument()
  })

  it('keeps the phone list button outside the chart', () => {
    render(<ListMessage message={list} channel="whatsapp" interactive />)

    expect(screen.getByRole('button', { name: 'View plans' })).toBeInTheDocument()
    expect(document.querySelector('[data-chart-anchor]')).toBeNull()
  })
})
