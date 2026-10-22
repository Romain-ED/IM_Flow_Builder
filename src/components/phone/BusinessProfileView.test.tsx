import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BusinessProfileView } from './BusinessProfileView'

describe('BusinessProfileView', () => {
  afterEach(() => cleanup())
  it('routes an RCS brand without an authored profile to the fallback profile', () => {
    render(<BusinessProfileView brand={{ name: 'Northwind Store' }} channel="rcs" open onClose={() => {}} />)
    expect(screen.getByText('Info & options')).toBeInTheDocument()
    expect(screen.getByText('northwind-store.example')).toBeInTheDocument()
    expect(screen.getByText('support@northwind-store.example')).toBeInTheDocument()
  })

  it('keeps WhatsApp rendering generic', () => {
    render(<BusinessProfileView brand={{ name: 'Northwind Store' }} channel="whatsapp" open onClose={() => {}} />)
    expect(screen.getByText('Business profile · WhatsApp messaging')).toBeInTheDocument()
    expect(screen.queryByText('northwind-store.example')).not.toBeInTheDocument()
  })
})
