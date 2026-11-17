import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import { buildChartScenarioOptions } from './chartScenario'
import { FlowChartPage } from './FlowChartPage'

const options = buildChartScenarioOptions(BUILT_IN_SCENARIOS.slice(0, 2), [])

describe('FlowChartPage', () => {
  afterEach(() => cleanup())

  it('shows the selected scenario name and its graph', () => {
    render(<FlowChartPage options={options} selectedKey={options[1].key} onSelect={vi.fn()} onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: options[1].name })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Scenario' })).toHaveValue(options[1].key)
  })

  it('reports the new key when the picker changes', () => {
    const onSelect = vi.fn()
    render(<FlowChartPage options={options} selectedKey={options[0].key} onSelect={onSelect} onBack={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Scenario' }), { target: { value: options[1].key } })

    expect(onSelect).toHaveBeenCalledWith(options[1].key)
  })

  it('falls back to the first option when the selected key is unknown', () => {
    render(<FlowChartPage options={options} selectedKey="builtin:missing" onSelect={vi.fn()} onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: options[0].name })).toBeInTheDocument()
  })

  it('calls onBack from the Back button', () => {
    const onBack = vi.fn()
    render(<FlowChartPage options={options} selectedKey={options[0].key} onSelect={vi.fn()} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: /back to scenarios/i }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
