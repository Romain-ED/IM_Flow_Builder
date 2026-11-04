import entries from './changelog.json'

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

/**
 * Newest first, stored in changelog.json. Add an entry there whenever
 * APP_VERSION (see version.ts / package.json) is bumped, so the Manual page's
 * Changelog section always reflects what shipped in each version.
 */
export const CHANGELOG: ChangelogEntry[] = entries
