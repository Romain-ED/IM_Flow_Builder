import { rcsProfileSchema, type BrandDefinition, type RcsProfile } from '../../schema/flow'

export type NormalizedRcsProfile = RcsProfile & {
  avatar?: string
  logo?: string
  banner?: string
  verified: boolean
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
  return slug || 'business'
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function normalizeRcsProfile(brand: BrandDefinition): NormalizedRcsProfile {
  const authored = brand.rcsProfile
  if (authored) {
    return {
      ...authored,
      avatar: brand.avatar,
      logo: brand.logo,
      banner: brand.banner,
      verified: brand.verified ?? false,
    }
  }

  const displayName = brand.shortName?.trim() || brand.name.trim()
  const slug = slugify(displayName)
  const domain = `${slug}.example`
  const phone = `+1 202 555 ${String(100 + fnv1a(slug) % 100).padStart(4, '0')}`
  const fallback = rcsProfileSchema.parse({
    displayName,
    subtitle: brand.description?.trim() || 'Business messaging',
    brandLabel: displayName,
    phone,
    websiteLabel: domain,
    websiteUrl: `https://${domain}`,
    email: `support@${domain}`,
    imageCount: 0,
    imageUrls: [],
  })
  return {
    ...fallback,
    avatar: brand.avatar,
    logo: brand.logo,
    banner: brand.banner,
    verified: brand.verified ?? false,
  }
}
