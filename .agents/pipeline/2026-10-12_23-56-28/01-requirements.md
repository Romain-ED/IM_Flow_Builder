# Requirements: Android RCS Conversation and Business Profile Screenshot Match

## Summary

Update the existing Android RCS demo UI in the simulator so its conversation view and business profile view closely match the supplied reference screenshots. The work covers visual structure, copy, colors, spacing, controls, carousel behavior, business-profile information, and narrow mobile presentation while retaining the simulator’s current scenario, action, navigation, and responsive functionality. Existing pizza and brand assets must be reused where suitable, and no dependency additions are expected unless an essential gap is demonstrated.

Assumptions:
- The existing RCS channel and its business-profile interaction are the surfaces to update; no separate application or route is required.
- The currently selected/demo RCS scenario remains the source of message/action behavior, with its displayed content adjusted as necessary to meet the reference copy.
- The reference screenshots are authoritative for visual appearance, but exact pixel dimensions are not available as machine-readable specifications; visual acceptance will use the supplied screenshots at a narrow Android-like viewport.
- “Second card beginning with the $9.99 offer” means the second visible carousel card must visibly present the existing/intended $9.99 offer, while any additional cards remain compatible with the current scenario.

## Functional Requirements

1. **RCS conversation surface**
   - The RCS conversation must use the reference’s pale lavender Android Messages-style background and header treatment.
   - The header must include a back arrow, green rounded-square brand avatar, the title `Romain RCS Demo Agent`, and an overflow/more-options control. Existing profile-opening behavior from the business identity must remain available.
   - The conversation must show the `More options:` rounded chip in the same message-area context as the reference.
   - The composer must be a rounded Android-style input control containing, in the reference order and visual grouping, a plus control, `RCS message` placeholder, emoji control, image/media control, and a purple rounded voice/action button.

2. **RCS carousel content and behavior**
   - The pizza carousel must be horizontally scrollable, use rounded cards, and expose a partial view of the next card at the narrow reference viewport rather than collapsing all cards into a vertical layout.
   - The first card must display the title `Everyday Value — 1 Regular Pizza`.
   - The first card must display the body text `1 Regular Pizza for just $5.99! Choose from our classic range. Perfect for a solo meal. 🍕`.
   - The first card must provide the actions `Order for $5.99` and `See All Deals`, in that order, with the existing action semantics preserved where applicable.
   - The second visible card must begin with the `$9.99` offer and use an existing or reused pizza image asset where one is available.
   - Carousel scrolling must continue to work with touch/pointer input and must not prevent existing interactive card actions from functioning.

3. **Business profile surface**
   - Opening the business profile from the RCS identity must show an Android-like pale lavender page rather than the conversation background.
   - The profile must contain a green branded banner with `Romain`, `RCS Agent Demo`, and `Vonage`, plus the outlined R mark and chat-bubble branding shown in the reference.
   - A green avatar must overlap the banner in the reference position and treatment.
   - The centered profile identity must read `Romain RCS Demo Agent` with `Romain demo` beneath it.
   - Four pale-blue action buttons must be present and labeled `Call`, `Website`, `Email`, and `Search`.
   - An `Images` row must show count `44`, a chevron, and three pizza thumbnails using existing reusable assets.
   - The profile must include rows for phone `9750 2284`, website `www.vonage.com`, and email `romain.edin@vonage.com`.
   - The profile must include `View Privacy Policy`, `View Terms of Service`, `Notifications`, `Chat theme`, and `Archive` rows.
   - The profile must include a red `Block and report spam` action and the bottom RCS encryption disclaimer with `Learn more`.
   - Existing profile navigation/close behavior and any currently supported profile actions must remain functional unless the reference explicitly replaces their presentation.

4. **Assets and existing functionality**
   - Existing pizza and brand assets must be preferred over duplicate new assets.
   - The update must not remove unrelated channels, scenarios, simulator controls, or existing RCS action behavior.
   - No new package dependency may be introduced unless it is essential to satisfy the reference UI and cannot reasonably be implemented with the current React, Tailwind, Lucide, and project asset stack.

## Non-Functional Requirements

- **Visual fidelity:** At a narrow mobile/Android-like viewport, the conversation and profile must match the reference in hierarchy, alignment, colors, rounded shapes, typography scale, spacing, card proportions, visible copy, and partial-carousel visibility closely enough for visual screenshot comparison.
- **Responsive behavior:** Layouts must remain usable within the existing phone frame and at supported wider/narrower viewport sizes; carousel content may scroll horizontally without causing page-level horizontal overflow.
- **Accessibility:** Interactive controls must remain keyboard/focus reachable where supported, have meaningful accessible labels when they are icon-only, and expose readable text for visible actions and profile rows.
- **Compatibility and maintainability:** Use the project’s existing React/TypeScript and styling/assets conventions. Preserve type safety and avoid unrelated refactors.
- **Verification:** Run the package production build and relevant lint, type-check, and test commands. If browser/screenshot tooling is available, inspect the rendered UI at a narrow mobile viewport and verify the reported visual issue through execution rather than source inspection alone.

## Acceptance Criteria

1. At the existing simulator’s RCS conversation entry point, the rendered screen has a pale lavender Android Messages-style header/background and includes a back arrow, green rounded-square avatar, `Romain RCS Demo Agent`, and an overflow control.
2. The conversation renders a `More options:` chip and a rounded composer containing plus, `RCS message`, emoji, image/media, and purple voice/action controls in the reference-like arrangement.
3. The first carousel card visibly contains the exact title `Everyday Value — 1 Regular Pizza`, the exact specified $5.99 body including the pizza emoji, and buttons labeled `Order for $5.99` and `See All Deals` in that order.
4. The carousel is horizontally scrollable at a narrow mobile viewport, has rounded pizza cards, and shows part of the next card without page-level horizontal overflow; the next card visibly begins with the $9.99 offer.
5. Existing carousel interactions remain usable: a user can scroll between cards and invoke the available card actions without a runtime error or loss of the existing action flow.
6. Activating the RCS business identity opens the business profile surface, which uses the pale lavender Android-like page treatment and does not display the conversation layout in place of the profile.
7. The profile renders the green branded banner with `Romain`, `RCS Agent Demo`, `Vonage`, outlined R mark, chat-bubble marks, overlapping green avatar, and centered identity `Romain RCS Demo Agent` / `Romain demo`.
8. The profile renders four pale-blue actions labeled `Call`, `Website`, `Email`, and `Search`, plus an `Images` row showing `44`, a chevron, and three pizza thumbnails.
9. The profile renders all required detail and settings labels/values: `9750 2284`, `www.vonage.com`, `romain.edin@vonage.com`, `View Privacy Policy`, `View Terms of Service`, `Notifications`, `Chat theme`, and `Archive`.
10. The profile renders a visually distinct red `Block and report spam` action and the bottom RCS encryption disclaimer with a `Learn more` link/action.
11. Existing unrelated simulator functionality and non-RCS channel surfaces continue to build and operate, and no unnecessary dependency is added.
12. The project’s `package.json` production build passes, relevant lint/type/test checks pass, and (when supported by the repository tooling) a narrow-viewport browser or screenshot check confirms the conversation and profile render without clipping, unexpected horizontal page scrolling, or console/runtime errors.

## Out of Scope

- Rebuilding the simulator shell, phone hardware frame, scenario editor, live diagnostics, or non-RCS channels.
- Adding a backend, new messaging protocol, persistence layer, authentication, or real call/email/search integrations.
- Changing the meaning or transport of carousel actions beyond preserving the existing demo behavior.
- Creating new brand/pizza artwork when an existing project asset can be reused.
- Adding dependencies solely for convenience or performing unrelated visual/system-wide refactors.
- Producing a native Android application; the deliverable remains the existing web-based simulator UI rendered inside its phone frame.
