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
    version: '0.16.0',
    date: '2026-08-17',
    changes: [
      'New: `**bold**`/`_italic_` text formatting, previously only available in `text` messages, now also renders in `rich_card`/`list` description/footer, carousel card subtitle/description, and image/video captions — extracted into a shared `FormattedText` component. Titles, headers, and button/chip labels intentionally stay plain, matching how those short-label fields render on the real platforms.',
      'All five built-in scenarios got a content pass using this: bold for codes, prices, order numbers and other key values; italic for secondary disclaimers and status notes — e.g. Beerlao and Pro Gadget Laos\'s OTP messages now read "Your code is **1234**. _It expires in 10 minutes._"',
    ],
  },
  {
    version: '0.15.1',
    date: '2026-08-17',
    changes: [
      'Fix: `input` messages showed a pencil icon and a "— reply using the box below." hint — neither exists on a real WhatsApp/RCS message, and it undercut the entire reason `input` is used over the invented `otp` type (rendering as an ordinary, unannotated text bubble). Removed both; `input` now renders identically to a plain business text message.',
      'Fix: the Beerlao and Pro Gadget Laos event/launch cards showed an extra "Maybe later"/"Not right now" button floating separately below the rich_card, instead of inside it — node-level `actions` only attach into the same card when the last message is business `text`, not a `rich_card`/`carousel`/`list`, so it rendered as a second independent button group, which no real WhatsApp/RCS message has. Folded both into the card\'s own `actions` list as a third embedded button instead. `docs/SCENARIO_AUTHORING_GUIDE.md` gained an explicit warning against this pairing so it doesn\'t recur.',
      'Fix: `event-boun-souang-heua-promo.jpg` was actually PNG data saved with a `.jpg` extension (a GitHub upload doesn\'t validate this) — broke image loading, and separately hid the file from the PWA precache entirely since `.jpg` wasn\'t in `vite.config.ts`\'s glob patterns, so the bug never surfaced in a build. Renamed to `.png`, added `jpg`/`jpeg` to the precache patterns, and raised the precache size cap so this real ~2.5 MB photo is included for offline use.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-08-17',
    changes: [
      'New: fifth built-in scenario, "Pro Gadget Laos pre-order & launch" — adapted from a real technical integration spec PDF (SMS + WhatsApp requirements for a Vientiane phone/wearables storefront). Phone-verified pre-order via a typed OTP code, order confirmation and shipping status updates, then a WhatsApp product-launch broadcast with a promo code — with copy pulled directly from the spec\'s own worked examples rather than invented.',
      'Same otp→input approach as Beerlao (see 0.12.1): the spec\'s "typed code with validation" OTP flow uses the real-supported input type, not the invented otp segmented-entry component.',
      'Added three placeholder assets (brand avatar, two product illustrations) in the existing flat-icon style since no real photos were supplied for this one.',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-08-17',
    changes: [
      'New: shared scenario links now open in a restricted viewer instead of the full app — just the phone simulation and a Restart button, with no header nav, no Sidebar (scenario switcher, channel toggle, brand/variable editors, debug options), no Scenarios/Manual pages, and no Flow Inspector. A link recipient can only experience the one scenario the link author shared, never the rest of the tool or any other scenario.',
      'This is a new `sharedLinkMode` flag, set once when a page load starts from a share-link URL — deliberately not a user-togglable preference like Presenter Mode, and never persisted, since it describes how this page load started rather than a setting to remember.',
      'Capability-warning/fallback notes (the small amber debug text) are now also hidden in shared-link mode, matching Presenter Mode — a link recipient has no "Show capability warnings" toggle to reach anyway, since there\'s no Sidebar.',
    ],
  },
  {
    version: '0.13.1',
    date: '2026-08-17',
    changes: [
      'Beerlao now uses real brand assets instead of placeholder SVGs: the actual Beerlao logo as the account avatar, and the real Boun Souang Heua boat-racing promo photo (with its own header/footer/16%-off copy) as the event_promotion rich_card image.',
      'Removed the placeholder brand-avatar-beerlao.svg and event-boun-souang-heua.svg they replaced, plus a duplicate copy of the promo photo left over from the asset upload, so the repo doesn\'t carry unreferenced image files.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-08-13',
    changes: [
      'New: `header` and `footer` text fields on `rich_card` and `list` messages, matching a real WhatsApp interactive message\'s header/body/footer/buttons envelope. A `rich_card` header is text OR `image`, never both — setting both now fails validation, the same as a real WhatsApp send would reject it. Length is capped at 60 characters each (Meta\'s real limit), enforced as the usual live capability warning.',
      'These only render on the WhatsApp channel — RCS rich cards have no dedicated header/footer fields at all (title + description + media + suggestions only, per Google\'s spec), so authoring them for a scenario that\'s also viewed on RCS is a no-op there rather than an invented approximation.',
      'Demoed in two built-ins: the e-commerce scenario\'s priority-upgrade card now has a "Limited-time offer" header, and Beerlao\'s event-promotion card has a "Drink responsibly" footer.',
    ],
  },
  {
    version: '0.12.2',
    date: '2026-08-13',
    changes: [
      'New: an automated test (`scenarios.test.ts`) now fails the build if any built-in scenario ever uses a message type with no real WhatsApp or RCS equivalent — the same class of bug that shipped the Beerlao `otp` warning is now caught in CI/local verification, not just by memory.',
      'Fix: `rcsCapabilities.ts` incorrectly listed `calendar_event` as a native RCS message type — Google\'s RCS spec only has text/file/rich-card content, calendar creation is a suggested-action subtype, not a standalone message. No built-in used it, so this was a latent gap, not a visible bug; a custom scenario using it on RCS now correctly shows the fallback note instead of rendering as if it were real.',
      'Fix: `docs/SCENARIO_AUTHORING_GUIDE.md` (which is the literal system prompt for the AI scenario generator) still listed `input` as having "no official WhatsApp/RCS payload equivalent" — the exact misconception that caused the Beerlao bug in the first place. Corrected so the AI-authoring path stops steering "add an OTP step" requests toward the invented `otp` type.',
    ],
  },
  {
    version: '0.12.1',
    date: '2026-08-13',
    changes: [
      'Fix: the Beerlao scenario\'s OTP entry step visibly showed the "not officially supported" capability warning on WhatsApp, since the `otp` segmented-entry component has no real wire-format equivalent — the 0.12.0 entry below framed this as an intentional exception, but the user asked for zero unsupported-type warnings on any built-in scenario, so that framing no longer holds. Swapped `otp` for `input` in `otp_entry`: same typed-code, wrong-code-error, retry-loop behavior (the downstream condition node only reads the `enteredOtp` variable, not which message type set it), but `input` renders as a plain text bubble backed by the ordinary composer — a real, supported WhatsApp pattern — so the warning is gone.',
      'All four built-in scenarios now use only officially-supported message types with no capability warnings anywhere in their flows, verified end-to-end (wrong code → error → retry → correct code → login → event promo).',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-08-13',
    changes: [
      'New: fourth built-in scenario, "Beerlao login & event promo" — a user-typed OTP login (wrong code → error → retry loop → correct code) followed by an event promotion card with a campaign image, adapted from a user-supplied flow.',
      'This is a deliberate exception to the "built-ins only use official types" rule the other three scenarios follow: it uses the simulator-only `otp` segmented-entry UI on purpose, as a legitimate simulator extension for a story that does not map cleanly to WhatsApp\'s real Authentication Template. It still shows the honest capability-warning note.',
      'Added two small placeholder image assets (brand avatar, campaign banner) demonstrating `brand.avatar` and `rich_card.image` with real pixels instead of leaving them unset.',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-08-12',
    changes: [
      'New: the composer is now always typable — previously it was disabled ("Tap a suggestion above") unless a node had a structured `input` message active. Whatever the user types now always sends as an outgoing bubble, matching how a real WhatsApp/RCS composer behaves.',
      'New: global keyword `triggers` — declare `{ keywords: [...], next: "<node>" }` at the top level of a scenario and typing any of those words anywhere in the conversation jumps straight to that node, as an "anytime" escape hatch (e.g. "type HELP anytime"). Takes priority even over an active structured `input` field. Typed text that matches nothing just sends with no automatic response, same as a real bot that doesn\'t understand.',
      'The ecommerce demo scenario now has a `help`/`support` trigger reusing its existing "help" node, so typing "help" at any point reaches the same content the "Need help?" button already did.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-08-12',
    changes: [
      'New: a "Brand" section in the sidebar lets you edit the business profile shown in the chat header — name, short name, profile picture (upload a file or paste a URL), description subtitle, and the verified checkmark — without touching the scenario\'s YAML. Applies immediately, no restart needed, and persists per scenario like the Variables section already does.',
      'New: `brand.description` scenario field — the subtitle shown under the name in the header (previously hardcoded to "Business Account" / "Business messaging"). Existing scenarios are unaffected; it only changes behavior when set.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-08-12',
    changes: [
      'New: "Generate with AI" in the scenario editor. Describe a conversation and paste in your own Anthropic API key to generate a scenario directly in the browser — no backend, the key is stored only in this browser and sent only to Anthropic. The result is automatically checked against the app\'s own validator, with one self-correcting retry if it fails.',
      'New: a "Copy prompt instead" option in the same modal — no API key needed, copies a complete authoring spec plus your description to paste into any AI tool you already use.',
      'New: `docs/SCENARIO_AUTHORING_GUIDE.md`, a hand-maintained canonical spec (schema reference, every message type\'s shape, real WhatsApp/RCS limits, the button-attachment rule) that powers both of the above and is also browsable on its own.',
    ],
  },
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
