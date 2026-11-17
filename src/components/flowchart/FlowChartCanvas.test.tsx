import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FlowChartCanvas } from './FlowChartCanvas'

describe('FlowChartCanvas', () => {
  afterEach(() => cleanup())

  it('renders every child inside the zoomable content', () => {
    render(
      <FlowChartCanvas contentWidth={400} contentHeight={300}>
        <p>Node A</p>
        <p>Node B</p>
      </FlowChartCanvas>,
    )

    expect(screen.getByText('Node A')).toBeInTheDocument()
    expect(screen.getByText('Node B')).toBeInTheDocument()
  })

  it('keeps the chart content at its authored size before zoom', () => {
    render(
      <FlowChartCanvas contentWidth={400} contentHeight={300}>
        <p>Node A</p>
      </FlowChartCanvas>,
    )

    expect(screen.getByText('Node A').parentElement).toHaveStyle({ width: '400px', height: '300px' })
  })

  it('keeps the content rendered after reset view is clicked', () => {
    render(
      <FlowChartCanvas contentWidth={400} contentHeight={300}>
        <p>Node A</p>
      </FlowChartCanvas>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }))

    expect(screen.getByText('Node A')).toBeInTheDocument()
  })
})
