import { assetUrl } from './assetUrl'

/**
 * Validates authored media URLs without performing network requests.
 * Scenario media is root-relative so it can be resolved against Vite's base;
 * remote media must use HTTP(S).
 */
export function validatedMediaSource(raw: string | undefined): string | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  if (!value || Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  }) || value.startsWith('//')) return undefined

  if (value.startsWith('/')) return value

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.href
  } catch {
    return undefined
  }
}

/** Resolve a validated authored media URL through the configured Vite base. */
export function mediaUrl(raw: string | undefined): string | undefined {
  const source = validatedMediaSource(raw)
  return source ? assetUrl(source) : undefined
}
