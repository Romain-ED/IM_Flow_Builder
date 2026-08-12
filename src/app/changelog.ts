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
    version: '0.5.1',
    date: '2026-08-11',
    changes: [
      'Fix: a node\'s `actions` button row was rendered as a bar pinned above the composer, persisting across scrolling — real WhatsApp/RCS always attach interactive buttons to the one message that offered them. `actions` now renders inline, attached to the last message, identically to how a `suggested_replies` message already looked.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-08-11',
    changes: [
      'Fix: RCS no longer claims native support for `list` messages — Google\'s RCS spec models content as text, files, or rich cards only (no list/menu picker), so `list` now correctly falls back to a stacked-option rich card on RCS with an explanatory note, matching WhatsApp\'s (which does have a native list) already-correct behavior.',
      'New: real structural limits from Meta\'s WhatsApp Cloud API and Google\'s RCS Business Messaging spec (button/chip counts, label lengths, carousel size, list row limits) are now checked live against authored content, with an inline warning when a channel\'s actual limits are exceeded — previously these numbers were declared but never enforced.',
      'New: "Real platform limits" reference table added to the Manual, documenting exactly what was verified against the official specs.',
    ],
  },
  {
    version: '0.4.3',
    date: '2026-08-11',
    changes: [
      'Fix: GitHub Pages deploys were failing silently on pushes to main because the repo\'s Pages environment only allows deployments from its actual default branch. The workflow now triggers from the correct branch, so pushes deploy automatically again instead of leaving a stale (blank-page) build live.',
    ],
  },
  {
    version: '0.4.2',
    date: '2026-08-11',
    changes: [
      'Infra: repository renamed to IM_Flow_Builder and made public (GitHub Pages requires either a public repo or a paid plan) — updated the GitHub Pages base path and all URL references to match.',
    ],
  },
  {
    version: '0.4.1',
    date: '2026-08-11',
    changes: [
      'Infra: deployed to GitHub Pages via a GitHub Actions workflow that builds and publishes on every push to main.',
      'Fix: scenario-authored asset paths (brand avatars/logos, message images) now resolve correctly under a sub-path deployment, not just at a domain root.',
    ],
  },
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
