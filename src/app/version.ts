import pkg from '../../package.json'

/**
 * Single source of truth for the app version, shown in the header and the
 * Manual page. Bump this (package.json's "version") whenever a meaningful
 * set of changes ships, and add a matching entry to `changelog.ts`.
 */
export const APP_VERSION: string = pkg.version
