# Design Review: Android RCS Conversation and Business Profile Screenshot Match

## Findings

1. **HIGH — The required `$9.99` second-card appearance is not specified precisely enough, and the current renderer will not show it first.**
   - **Where:** `02-design.md`, “Flow and data model,” the `promotions` fixture instructions; also the carousel geometry instructions.
   - **Problem:** The requirement says the next card must visibly begin with the `$9.99` offer. The design only says to “ensure the second card title/body begins with the `$9.99` offer,” without choosing exact title/body text or specifying the rendering order. The actual fixture currently has the second card title `Everyday Value — 1 Large Pizza` and subtitle `$9.99`; `Carousel.tsx` renders the title before the subtitle. Therefore, implementing the design literally still presents `Everyday Value — 1 Large Pizza` before `$9.99`, which can fail acceptance criterion 4.
   - **Concrete fix:** Choose and document exact second-card copy whose first visible text is the offer, for example:
     ```yaml
     title: "$9.99 — Everyday Value: 1 Large Pizza"
     description: "1 Large Pizza for just $9.99! More slices, more smiles. 😄"
     ```
     Either remove the separate subtitle or explicitly require the carousel to render the `$9.99` subtitle before the title. Add a test that asserts the second card’s rendered text starts with `$9.99` rather than merely containing it.

2. **MEDIUM — “Attached reply choices” is incompatible with the current RCS attachment path unless the design names the required ConversationView change.**
   - **Where:** `02-design.md`, “RCS renderer, header, theme, and conversation,” and “Flow and data model”; the file list omits `src/components/phone/ConversationView.tsx` as a required modification.
   - **Problem:** The current `ConversationView` sets `canAttach` from `channelThemes[channel].chipStyle === 'stacked'`. The current RCS theme uses `chipStyle: 'pill'`, so a `More options:` text followed by `suggested_replies` is deliberately rendered as a separate floating chip row, not as trailing actions attached to the text. The design simultaneously says to preserve RCS pill treatment and says the compact fixture has “attached reply choices.” The existing RCS normalizer also treats suggestions as attached to an RCS content message, so this is not only visual terminology.
   - **Concrete fix:** Make one explicit choice. Either (a) document that RCS choices remain a separate native pill row and remove “attached” from the fixture/test contract, or (b) add `ConversationView.tsx` to the modification list and specify a narrow RCS rule for attaching only the `More options:` suggestions (including its same-node constraint), with a render test covering the exact structure. Do not silently change the global `canAttach` rule because that would alter unrelated RCS scenarios.

3. **HIGH — The existing `post_promo_nav` reachability is assumed but is currently false, and the design does not define the choice mapping.**
   - **Where:** `02-design.md`, “Flow and data model,” the instruction to move the long follow-up messages to `post_promo_nav` and keep that node reachable from a More-options choice.
   - **Problem:** In the actual fixture, `post_promo_nav` exists, but the current `promotions` node’s `Main Menu` choice points to `welcome` (the source contains `next: welcome` immediately before `post_promo_nav`). No current reference points to `post_promo_nav`. The design says it will be reachable but does not state which label should point there or whether the current `Main Menu` behavior is intentionally changing. A coder can leave the node unreachable, or change the wrong choice and break the existing flow semantics.
   - **Concrete fix:** Specify the exact transition, for example: “In `promotions`, the `More options:` `Main Menu` suggested reply changes from `next: welcome` to `next: post_promo_nav`; all other existing card/action `next` and `set` values remain unchanged.” Add a fixture test asserting that exact label-to-node mapping.

4. **MEDIUM — The profile schema’s validation limits and outbound-URL scope are not concrete enough to implement or test consistently.**
   - **Where:** `02-design.md`, “Flow and data model,” the nested profile schema and “shared safe URL schema” paragraphs.
   - **Problem:** “Text fields have practical maximum lengths” is not an invariant: it does not say the limits for display name, description, brand label, phone, email, image paths, or policy URLs. The design also does not clearly say whether the safe URL rule applies only to nested `rcsProfile` fields or to the ordinary top-level `brand.website`, which is an outbound `href` in the existing generic profile. The current `brandDefinitionSchema` accepts any non-empty website string, and `BusinessProfileView.tsx` uses it directly in `href`.
   - **Concrete fix:** Define named constants and apply them in schemas, e.g. `displayName.max(80)`, `description.max(160)`, `label.max(80)`, `phone.max(32)`, `imageUrl.max(2048)`, and `policyUrl.max(2048)`. Explicitly choose one URL rule for top-level `brand.website`: either validate it with the same HTTPS/app-relative safe URL schema and state that legacy invalid values are rejected, or preserve the legacy field but sanitize/disable unsafe generic-profile links. Add rejection tests for protocol-relative, whitespace, `javascript:`, `data:`, and over-limit values for every field that can reach an `href` or `src`.

5. **MEDIUM — Invalid live brand-editor patches have no specified behavior despite the requirement to validate them.**
   - **Where:** `02-design.md`, “Flow and data model,” the `updateConfiguredBrand()` paragraph and editable override schema.
   - **Problem:** The current store method is `updateConfiguredBrand(patch: Partial<BrandDefinition>) => void`; it merges the patch directly into state and persists it. The design says to validate patches before persisting and to restrict overrides to ordinary fields, but it does not define whether an invalid email/website/name patch is rejected, partially applied, reverted, or reported. It also does not explicitly narrow the method signature, so TypeScript callers could still pass `rcsProfile` after adding that field to `BrandDefinition`.
   - **Concrete fix:** Define an `EditableBrandOverride` type/schema and change the method to `updateConfiguredBrand(patch: Partial<EditableBrandOverride>): boolean` (or an equivalent result type). Parse the candidate merged editable override; on failure leave state and localStorage unchanged and show a non-fatal validation toast; on success merge only the parsed ordinary fields over the validated flow brand and retain `flow.brand.rcsProfile`. Add tests for invalid email, unsafe website, and a patch attempting to supply `rcsProfile`.

6. **MEDIUM — The target RCS header’s treatment of the existing video and phone controls is ambiguous and can fail visual matching.**
   - **Where:** `02-design.md`, “RCS renderer, header, theme, and conversation.”
   - **Problem:** The current `RcsHeader.tsx` renders back, avatar/title, video-call, call, and overflow buttons. The design requires back, the green avatar/title, and overflow, but never says whether the existing video and call buttons are removed, retained, or replaced for the screenshot target. Keeping them can add controls not present in the reference and consume title/header width; removing them without a branch could alter other RCS brands.
   - **Concrete fix:** Specify the target behavior: for a validated `rcsProfile`, render exactly back, identity button, and overflow; for an RCS brand without `rcsProfile`, retain the existing video/call controls (or explicitly remove them for all RCS). Add a header test asserting the target control set and the fallback-brand control set.

7. **NIT — The narrow visual verification procedure lacks reproducible entry and settled-state details.**
   - **Where:** `02-design.md`, “Testability and verification.”
   - **Problem:** It says to use the dev/preview app at a 360 CSS-pixel viewport and wait until playback settles, but does not identify the simulator entry point, whether `fastMode` must be enabled, or the exact state signal to wait for. That makes a manual result difficult to reproduce and can produce a screenshot during the store’s async playback.
   - **Concrete fix:** Record the exact procedure: load the built-in `dominos-singapore-rcs-demo`, assert `flow.start === 'promotions'`, wait for `isPlaying === false` and `pendingOutcome.kind === 'idle'`, set viewport width to 360 CSS px, inspect `document.documentElement.scrollWidth === clientWidth`, then capture conversation and profile screenshots.

## Verified Assumptions

- `package.json` uses React 19, TypeScript, Vite, Tailwind 4, Zustand, Zod, Lucide, and Vitest, and has no browser/screenshot dependency beyond jsdom; the design’s no-new-dependency constraint matches the repository.
- The current RCS renderer and header are `src/channels/rcs/RcsRenderer.tsx` and `src/channels/rcs/RcsHeader.tsx`; the renderer hard-codes `bg-[#f0f4f9]`, while the theme also defines the same cool-gray `screenBg`.
- The current RCS header has a no-op back button, a generic circular `Avatar`, title based on `shortName ?? name`, and video, phone, and overflow controls. The business identity button already calls the profile-opening callback.
- The current `Composer.tsx` has one generic text form with `Type a message` as the non-input placeholder, plus a send/mic toggle; it does not contain the requested RCS plus, emoji, media, or purple action controls. It does preserve live-session, terminal, and error branches before the form.
- The current `Carousel.tsx` uses a hard-coded `CARD_WIDTH = 200`, native horizontal scrolling/snap, `ImageWithFallback`, and `ActionButton`; action buttons dispatch through `useSimulatorStore.handleAction`, so the design’s action-preservation claim is feasible.
- The current RCS theme has `chipStyle: 'pill'`, and `ConversationView.tsx` therefore does not merge RCS suggested replies into `MessageShell` trailing actions. RCS reply controls are rendered in a separate pill row.
- The current generic profile is the only profile implementation. It has a working close/back callback, direct `tel:`, website, and `mailto:` links, but its overflow button has no handler. No dedicated RCS profile branch or `rcsProfile` schema exists yet.
- The current fixture starts at `welcome`; its `promotions` card already has the exact required first-card title/body/action labels and its second card has `$9.99` only as the subtitle. The promotions node also currently contains the long follow-up text before `More options:`.
- The proposed reusable pizza assets exist at the three stated paths under `public/assets/dominos-singapore-rcs-demo/`.
- The current persistence boundary casts parsed localStorage JSON directly to `StoredScenario`, and `configuredBrand` is typed/stored as a full `BrandDefinition`; `loadFlow()` currently accepts the persisted brand override without validation, and `updateConfiguredBrand()` merges arbitrary patches before persisting.
- The three proposed asset paths are compatible with the existing `ImageWithFallback`/`assetUrl` handling for app-relative paths, and no Vonage/RCS banner asset was found by searching the source/public trees; CSS/Lucide primitives are therefore feasible for the banner marks.

## Unverified/Wrong Assumptions

- **Wrong as a statement about the current fixture:** `post_promo_nav` is not currently reachable from the promotions More-options choice. The current choice points to `welcome`; reachability must be created explicitly.
- **Unverified:** The supplied reference screenshot’s exact colors, dimensions, banner geometry, card height, and control ordering cannot be verified from the repository files. The design needs to make the remaining target-specific choices explicit enough for implementation and screenshot review.
- **Unverified:** The design’s assertion that generic-profile `tel:`, HTTPS, and `mailto:` behaviors are already “validated” is only partly true. The generic component constructs `tel:`/`mailto:` links and uses the raw website string; the current top-level schema only validates email format and does not validate website protocol or phone contents.
- **Unverified:** The claim that a compact promotions node will show the complete first card, a partial second card, More-options controls, and the composer simultaneously is not established by source inspection. `ConversationView` always scrolls to the bottom after history changes, and no rendered narrow-viewport measurement currently proves the composition fits.

## Verdict

CHANGES_REQUESTED — 2 HIGH findings and 4 MEDIUM findings remain unresolved.
