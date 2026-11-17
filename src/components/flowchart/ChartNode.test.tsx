import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ChartNodeItems } from '../../engine/flowChartItems'
import { CHART_BUBBLE_WIDTH, conditionSummary } from '../../engine/flowChartItems'
import { ChartNodeBubbles, ChartNodeFrame } from './ChartNode'

const header = { id: 'check', label: 'Plan check', isStart: false }

describe('ChartNodeFrame', () => {
  afterEach(() => cleanup())

  it('fades an unreachable node', () => {
    const { container } = render(
      <ChartNodeFrame node={header} width={CHART_BUBBLE_WIDTH} dimmed>
        <p>body</p>
      </ChartNodeFrame>,
    )

    expect(container.firstElementChild).toHaveClass('opacity-50')
  })

  it('does not fade a reachable node', () => {
    const { container } = render(
      <ChartNodeFrame node={header} width={CHART_BUBBLE_WIDTH}>
        <p>body</p>
      </ChartNodeFrame>,
    )

    expect(container.firstElementChild).not.toHaveClass('opacity-50')
  })
})

describe('ChartNodeBubbles condition card', () => {
  afterEach(() => cleanup())

  it('shows the branch condition as a text card', () => {
    const items: ChartNodeItems = {
      nodeId: 'check',
      bubbles: [],
      floating: [],
      contentWidth: CHART_BUBBLE_WIDTH,
      condition: 'plan = premium',
    }
    render(<ChartNodeBubbles items={items} channel="rcs" />)

    expect(screen.getByText('plan = premium')).toBeInTheDocument()
    expect(screen.queryByText('No messages in this step')).not.toBeInTheDocument()
  })
})

describe('conditionSummary', () => {
  it('describes each operator', () => {
    expect(conditionSummary({ variable: 'plan', operator: 'equals', value: 'premium' })).toBe('plan = premium')
    expect(conditionSummary({ variable: 'amount', operator: 'greater_than', value: 100 })).toBe('amount > 100')
    expect(conditionSummary({ variable: 'email', operator: 'exists' })).toBe('email exists')
  })
})
