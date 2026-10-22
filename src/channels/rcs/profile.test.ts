import { describe, expect, it } from 'vitest'
import { normalizeRcsProfile } from './profile'

describe('normalizeRcsProfile', () => {
  it('preserves authored profile fields and projects shared fields', () => {
    const profile = normalizeRcsProfile({
      name: 'V Bank',
      logo: '/assets/logo.svg',
      banner: '/assets/banner.svg',
      verified: true,
      rcsProfile: {
        displayName: 'V Bank Support', subtitle: 'Personal banking', brandLabel: 'V Bank',
        phone: '+1 202 555 0183', websiteLabel: 'vbank.example', websiteUrl: 'https://vbank.example',
        email: 'care@vbank.example', imageCount: 0, imageUrls: [],
      },
    })
    expect(profile.displayName).toBe('V Bank Support')
    expect(profile.banner).toBe('/assets/banner.svg')
    expect(profile.verified).toBe(true)
  })

  it('creates deterministic reserved fallback contacts', () => {
    const brand = { name: 'Café North' }
    const first = normalizeRcsProfile(brand)
    const second = normalizeRcsProfile(brand)
    expect(first).toEqual(second)
    expect(first.websiteUrl).toBe('https://cafe-north.example')
    expect(first.email).toBe('support@cafe-north.example')
    expect(first.phone).toMatch(/^\+1 202 555 01\d{2}$/)
    expect(first.imageCount).toBe(0)
    expect(first.imageUrls).toEqual([])
  })
})
