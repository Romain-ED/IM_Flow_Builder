import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BUILT_IN_SCENARIOS } from './scenarios'

describe('flow chart navigation', { timeout: 60_000 }, () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('opens the flow chart from a scenario card and returns to the scenarios page', async () => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
    const { default: App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Scenarios' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /flow chart/i })[0])

    expect(await screen.findByRole('heading', { level: 1, name: BUILT_IN_SCENARIOS[0].name })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back to scenarios/i }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Manage scenarios' })).toBeInTheDocument()
  })
})
