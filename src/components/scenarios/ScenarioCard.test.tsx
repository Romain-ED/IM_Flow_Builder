import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ScenarioCard } from './ScenarioCard'

const baseProps = {
  name: 'Demo',
  badge: 'Built-in' as const,
  onLoad: vi.fn(),
  onView: vi.fn(),
  onDuplicate: vi.fn(),
  onExportJson: vi.fn(),
  onExportYaml: vi.fn(),
  onShareLink: vi.fn(async () => true),
}

describe('ScenarioCard flow chart button', () => {
  afterEach(() => cleanup())

  it('calls onFlowChart when the Flow chart button is clicked', () => {
    const onFlowChart = vi.fn()
    render(<ScenarioCard {...baseProps} onFlowChart={onFlowChart} />)

    fireEvent.click(screen.getByRole('button', { name: /flow chart/i }))

    expect(onFlowChart).toHaveBeenCalledTimes(1)
  })

  it('hides the Flow chart button when no handler is given', () => {
    render(<ScenarioCard {...baseProps} />)

    expect(screen.queryByRole('button', { name: /flow chart/i })).not.toBeInTheDocument()
  })
})
