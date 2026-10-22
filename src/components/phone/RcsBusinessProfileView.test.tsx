import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RcsBusinessProfileView } from './RcsBusinessProfileView'

describe('RcsBusinessProfileView', () => {
  afterEach(() => cleanup())
  it('renders normalized authored identity, contacts, banner, and verification', () => {
    render(<RcsBusinessProfileView open onClose={() => {}} brand={{
      name: 'V Bank', banner: '/assets/vbank/banner.jpg', verified: true,
      rcsProfile: {
        displayName: 'V Bank', subtitle: 'Personal banking and lending', brandLabel: 'V Bank',
        phone: '+1 202 555 0183', websiteLabel: 'vbank.example', websiteUrl: 'https://vbank.example',
        email: 'care@vbank.example', imageCount: 0, imageUrls: [],
      },
    }} />)
    expect(screen.getByText('V Bank')).toBeInTheDocument()
    expect(screen.getAllByText('Personal banking and lending')).not.toHaveLength(0)
    expect(screen.getByText('+1 202 555 0183')).toBeInTheDocument()
    expect(screen.getByText('vbank.example')).toBeInTheDocument()
    expect(screen.getByText('care@vbank.example')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'V Bank profile banner' })).toHaveClass('object-cover')
    expect(screen.getByLabelText('Verified business')).toBeInTheDocument()
    expect(screen.queryByText('Images')).not.toBeInTheDocument()
  })
})
