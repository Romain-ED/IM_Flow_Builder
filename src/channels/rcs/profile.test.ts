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

  it('derives the slug, label, and reserved contact from the normalized display name', () => {
    const profile = normalizeRcsProfile({ name: 'Acme Holdings', shortName: 'Acme' })
    expect(profile.displayName).toBe('Acme')
    expect(profile.brandLabel).toBe('Acme')
    expect(profile.websiteUrl).toBe('https://acme.example')
    expect(profile.email).toBe('support@acme.example')
    expect(profile.phone).toBe('+1 202 555 0115')
  })

  it('normalizes non-ASCII names and falls back to business for empty slugs', () => {
    const accented = normalizeRcsProfile({ name: 'Café North' })
    expect(accented.websiteUrl).toBe('https://cafe-north.example')
    expect(accented.phone).toBe('+1 202 555 0146')

    const emptySlug = normalizeRcsProfile({ name: '!!!' })
    expect(emptySlug.websiteUrl).toBe('https://business.example')
    expect(emptySlug.email).toBe('support@business.example')
    expect(emptySlug.phone).toBe('+1 202 555 0123')
  })

  it('caps long fallback slugs at 48 characters', () => {
    const profile = normalizeRcsProfile({ name: 'A'.repeat(60) })
    expect(profile.websiteLabel).toBe(`${'a'.repeat(48)}.example`)
    expect(profile.phone).toMatch(/^\+1 202 555 01\d{2}$/)
  })
})
