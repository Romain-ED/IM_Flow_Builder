import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import { anchoredEdges } from '../../engine/flowGraph'
import { NODE_ANCHOR } from '../../engine/flowAnchors'
import { loadChartFlow } from './chartScenario'
import { FlowChartView } from './FlowChartView'

function flowFor(scenarioId: string) {
  const scenario = BUILT_IN_SCENARIOS.find((item) => item.id === scenarioId)
  if (!scenario) throw new Error(`Missing built-in scenario ${scenarioId}`)
  const loaded = loadChartFlow(scenario.source)
  if (!loaded.ok) throw new Error(loaded.errors.join('; '))
  return loaded.flow
}

describe('FlowChartView', () => {
  afterEach(() => cleanup())

  it('draws each RCS node twice, once for measuring and once on the chart, and keeps both inert', async () => {
    const flow = flowFor('rcs-demo-menu')
    const { container } = render(<FlowChartView flow={flow} />)

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 5000 })
    expect(container.querySelectorAll('[inert]')).toHaveLength(flow.nodes.length * 2)
  })

  it('labels every node with its id', () => {
    const flow = flowFor('rcs-demo-menu')
    render(<FlowChartView flow={flow} />)

    for (const node of flow.nodes) {
      expect(screen.getAllByText(node.id).length).toBeGreaterThan(0)
    }
  })

  it('shows WhatsApp message text with variables left as written', () => {
    const flow = flowFor('restaurant')
    render(<FlowChartView flow={flow} />)

    expect(screen.getAllByText(/\{\{customerName\}\}/).length).toBeGreaterThan(0)
  })

  it('draws one arrow per transition, and every button with a transition has an anchor on the chart', async () => {
    const flow = flowFor('restaurant')
    const { container } = render(<FlowChartView flow={flow} />)
    const ids = new Set(flow.nodes.map((node) => node.id))
    const expected = flow.nodes.flatMap((node) => anchoredEdges(node)).filter((edge) => ids.has(edge.to))

    expect(expected.length).toBeGreaterThan(0)
    await waitFor(() => expect(container.querySelectorAll('path[data-chart-edge]')).toHaveLength(expected.length), {
      timeout: 5000,
    })
    const missing = expected
      .filter((edge) => edge.anchor !== NODE_ANCHOR)
      .filter((edge) => container.querySelector(`[data-chart-anchor="${edge.anchor}"]`) === null)
      .map((edge) => `${edge.from} ${edge.anchor}`)
    expect(missing).toEqual([])
  })
})
