/**
 * Resolves an app-relative asset path (e.g. "/assets/logo.svg", as authored
 * in scenario JSON/YAML) against the app's configured Vite `base`, so those
 * paths keep working when deployed under a sub-path (e.g. a GitHub Pages
 * project site at /IM_Flow_Builder/) instead of a domain root. Absolute
 * (http/https/data) URLs are returned unchanged.
 */
export function assetUrl<T extends string | undefined>(path: T): T {
  if (!path || !path.startsWith('/') || /^\/\//.test(path)) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (base + path) as T
}
