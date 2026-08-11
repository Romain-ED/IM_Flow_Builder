export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

/**
 * Newest first. Add an entry here whenever APP_VERSION (see version.ts /
 * package.json) is bumped, so the Manual page's Changelog section always
 * reflects what shipped in each version.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.4.0',
    date: '2026-08-11',
    changes: [
      'New: "View" button on every scenario card (Scenarios page) opens a read-only quick look — toggle between JSON and YAML source (with one-click Copy) and the flow graph, without loading the scenario or opening the full editor.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-11',
    changes: [
      'New: `system_action` message type — a compact, centered simulator notice (e.g. "Boarding pass downloaded", "Added to wallet") that is visually distinct from business/user chat bubbles.',
      'New: `typing` message type — an explicit, standalone typing-indicator beat authors can place anywhere in a flow (e.g. before a system_action), reduced in Fast demo mode like every other pause.',
      'Updated: the Singapore Airlines demo scenario now uses both new message types for its boarding-pass download and add-to-wallet confirmations.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-11',
    changes: [
      'New: side-by-side channel comparison mode — view RCS, WhatsApp, and Generic rendering the same live conversation at once.',
      'New: shareable scenario links — encode a flow into a URL so it opens pre-loaded for anyone you send it to, no file attachment needed.',
      'New: six additional message types — location, OTP/verification, payment request, calendar event, product catalog, and a WhatsApp Flow placeholder.',
      'New: visual flow graph viewer in the Flow Inspector and scenario editors — see the whole node structure at a glance and click any node to jump to it live.',
      'New: installable, offline-capable app (PWA) — works after the first load even without a network connection.',
      'New: version number and changelog, visible in the header and Manual page.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-11',
    changes: [
      'Initial release: conversation engine, RCS/WhatsApp/Generic channel rendering, full message-type set, the Singapore Airlines/e-commerce/restaurant demo scenarios, scenario editor with JSON/YAML import-export, flow inspector, Presenter Mode, and the Scenarios management + Manual pages.',
    ],
  },
]
