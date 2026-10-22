import { describe, expect, it } from 'vitest'
import { editableBrandOverrideSchema, rcsProfileSchema } from './flow'

const baseProfile = {
  displayName: 'Business', subtitle: 'Support', brandLabel: 'Business', phone: '+1 202 555 0100',
  websiteLabel: 'business.example', websiteUrl: 'https://business.example', email: 'support@business.example',
}

describe('RCS profile image validation', () => {
  it('defaults and enforces gallery invariants', () => {
    expect(rcsProfileSchema.parse(baseProfile)).toMatchObject({ imageCount: 0, imageUrls: [] })
    expect(rcsProfileSchema.safeParse({ ...baseProfile, imageCount: 0, imageUrls: ['/assets/image.png'] }).success).toBe(false)
    expect(rcsProfileSchema.safeParse({ ...baseProfile, imageCount: 1, imageUrls: [] }).success).toBe(false)
    expect(rcsProfileSchema.safeParse({ ...baseProfile, imageCount: 2, imageUrls: ['/assets/image.png'] }).success).toBe(true)
  })

  it('accepts safe authored and bounded editor image sources', () => {
    expect(rcsProfileSchema.safeParse({ ...baseProfile, imageCount: 1, imageUrls: ['https://cdn.example/image'] }).success).toBe(true)
    expect(editableBrandOverrideSchema.safeParse({ name: 'Business', banner: 'data:image/png;base64,aGVsbG8=' }).success).toBe(true)
    for (const value of ['//cdn.example/image', 'http://cdn.example/image', 'blob:https://example.test/id', 'javascript:alert(1)', 'data:text/plain;base64,aGVsbG8=', 'data:image/png;base64,not valid']) {
      expect(editableBrandOverrideSchema.safeParse({ name: 'Business', banner: value }).success).toBe(false)
    }
  })
})
