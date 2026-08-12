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
    version: '0.8.0',
    date: '2026-08-12',
    changes: [
      'Removed the Generic channel — the simulator now models RCS and WhatsApp only, matching the goal of showing exactly what those two platforms can actually do rather than a channel-neutral approximation.',
      'New: real-payload-shape validation. `channels/whatsapp/normalize.ts` and `channels/rcs/normalize.ts` build the actual WhatsApp Cloud API / RCS AgentMessage payload shape from a scenario\'s authored messages, and scenario loading now hard-fails — same as a broken node reference — when content structurally can\'t become a valid payload (buttons with no owning body text, too many buttons/rows/cards, an RCS carousel under 2 cards). Previously these were only soft, render-time warnings.',
      'This immediately caught 4 real violations in the built-in scenarios (a rich_card/carousel directly followed by a buttons-only suggested_replies message, with no body text) that the earlier soft-warning system had missed — fixed by adding a short connecting text message before each.',
      'RCS and WhatsApp intentionally have different "what can own a suggestion chip" rules in the new validator, matching their real specs: WhatsApp requires body text specifically, RCS allows any content message (text, media, or rich card) to own trailing suggestions.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-08-12',
    changes: [
      'Fix: standalone `suggested_replies`/`suggested_actions` messages had the same "floating below with a gap" problem 0.6.1 fixed for node.actions — a real WhatsApp interactive message can\'t be buttons with no body text. On WhatsApp, a `suggested_replies`/`suggested_actions` message that immediately follows a business text message in the same node now merges into that message\'s own card (divided footer, `suggested_actions` buttons get their real-world icon per type — phone/external-link/etc. — matching the existing standalone-action-button style). RCS keeps its accurate floating pill row unchanged.',
      'The merge/attach decision moved out of the component and into a new pure `engine/messageAttachment.ts` function (`computeMessageAttachments`), matching the project\'s engine-is-pure-and-testable convention — covered by 9 new regression tests.',
      'Content fix: the e-commerce scenario\'s "help" and "confirmed" nodes had a standalone suggested_actions/suggested_replies message with no body text at all (not just unattached — genuinely no real WhatsApp/RCS equivalent since buttons always need body text on the wire). Both now open with a short text message.',
      'Verified: rich_card and carousel-card buttons were already correctly scoped inside their own card (not floating) — no change needed there.',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-08-12',
    changes: [
      'Fix: a node\'s trailing `actions` on WhatsApp still rendered as a visually separate floating block below the message that offered them, with a gap — closer but not matching how a real WhatsApp interactive message actually looks (buttons as part of the same message, flush against it, divided by a thin line). They now render as a divided footer inside the same card as the preceding business text message, with no gap and no independent background/shadow, exactly like the app\'s own `suggested_replies` bubble already did.',
      'This only applies where WhatsApp\'s chip style is used ("stacked" — one full-width row per button). RCS suggestion chips correctly keep floating as their own separate pill row below the card, since that is how Google\'s real RCS UI actually renders them — the two platforms are not the same here and the fix does not unify them.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-08-11',
    changes: [
      'Fix: `rich_card` and `carousel` were incorrectly marked as unsupported on WhatsApp. Both are real — rich_card matches a WhatsApp interactive message (header/body/footer/buttons) and carousel matches WhatsApp\'s official Carousel Template (2 buttons/card, vs. RCS\'s 4) — corrected the capability declarations and fallback notes.',
      'Rewrote all three built-in scenarios to stop using flight_card, boarding_pass, otp, and payment_request/calendar_event — none have a real WhatsApp or RCS equivalent. Replaced with the official primitives a real integration would actually send: document+text+suggested_replies for boarding passes, plain text for one-time codes (matching WhatsApp\'s real Authentication Template pattern), rich_card+open_url for payment prompts, and text+suggested_replies for calendar invites. The message types themselves stay in the schema for custom scenarios, now with accurate fallback notes explaining the real-world equivalent.',
      'New: per-carousel-card button limits (WhatsApp: 2, RCS: 4) added to the capability-warning checks.',
      'Docs: Manual and README message-type tables now flag which types are verified-official vs. simulator-only conventions, and added CLAUDE.md with internal architecture/decision notes for future sessions.',
    ],
  },
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
