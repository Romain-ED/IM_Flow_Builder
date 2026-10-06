/**
 * Resolves an app-relative asset path (e.g. "/assets/logo.svg", as authored
 * in scenario JSON/YAML) against the app's configured Vite `base`, so those
 * paths work at the VCR domain root and under an optional alternate sub-path.
 * Absolute (http/https/data) URLs are returned unchanged.
 */
export function assetUrl<T extends string | undefined>(path: T): T {
  if (!path || !path.startsWith('/') || /^\/\//.test(path)) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (base + path) as T
}
