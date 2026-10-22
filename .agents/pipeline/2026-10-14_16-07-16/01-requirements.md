# Requirements: Live Demo, RCS Realism, and Accessible Selectors

## Summary
Improve the Live RCS Demo and channel/platform selection without changing existing product boundaries or requiring unnecessary dependencies. The demo must communicate progress and failures, retain user state during navigation, and offer a reset path. RCS authoring and preview must support richer message constructs and expose validation feedback plus an optional technical payload view. Channel/platform controls must retain full-color brand presentation while becoming accessible, keyboard-friendly, responsive, and understandable without relying on color alone. Existing behavior must remain intact, including any in-progress removal of stale fixed test-phone copy.

Assumptions: “during navigation” means state survives route/view changes within the app and does not require server-side or cross-device persistence; demo interactions remain simulated unless the existing application already provides a real transport; compliance checks validate the configurations supported by this application rather than claiming provider certification; and optional payload visibility is user-controlled and hidden by default if no existing preference is defined.

## Functional Requirements

1. **Reliable Live Demo**
   - Show a visible loading state while demo content or interactions are being initialized or refreshed, and prevent misleading duplicate actions while loading.
   - Show a clear, actionable error state when initialization, rendering, or supported demo operations fail; preserve recoverability where possible and avoid exposing raw internal errors to end users.
   - Provide a clearly labeled **Reset demo** action that restores the demo to its initial scenario, phone/input state, messages, status indicators, and transient errors.
   - Persist the selected scenario and user-entered phone state when navigating away and back, restoring them without overwriting valid user state with defaults.
   - Display a small, persistent demo-mode indicator explaining that the interaction is simulated (or accurately reflecting the existing runtime mode).
   - Make phone preview controls discoverable and usable on narrow screens, including clear labels/affordances and no clipping or inaccessible controls.
   - Remove or avoid stale copy that refers to a fixed test phone now that arbitrary user input is supported.

2. **RCS authoring and preview realism**
   - Support configuring and previewing rich cards and carousels, with the supported fields validated before rendering.
   - Support suggested replies and suggested actions, including their visible labels and interaction affordances.
   - Support typing indicators and delivery/read states in the preview using the existing demo/message model where applicable.
   - Preserve image aspect-ratio intent in preview and handle unsupported, missing, or invalid image dimensions without broken layout.
   - Wrap long message text and long labels safely within the available preview width without horizontal overflow.
   - Provide a compliance checker that flags unsupported or invalid configurations, identifies the affected configuration, and distinguishes blocking errors from non-blocking warnings. Invalid configurations must not silently produce misleading output.
   - Provide an optional resulting payload/JSON view adjacent to or associated with the visual preview for technical users. The displayed result must correspond to the current valid configuration and clearly indicate validation failures when no valid payload can be produced.

3. **Channel/platform selectors and branding**
   - Keep RCS, WhatsApp, iPhone, and Android/channel-platform controls visually branded with full-button product/channel colors and official logos, while retaining readable text.
   - Expose strong selected and unselected states using more than color alone (for example, an indicator, border, icon, or equivalent state treatment).
   - Provide concise tooltips or short descriptions for each selector, including enough context for unfamiliar icons/brands.
   - Implement brand logos as reusable accessible components with meaningful alternative text or decorative semantics as appropriate.
   - Expose the selector collection with appropriate radio-group semantics where it represents a single choice; expose each option’s checked/selected state programmatically.
   - Support keyboard navigation, activation, and visible focus states equivalent to pointer interaction.
   - Provide a neutral fallback/alternate theme or state treatment that preserves meaning for users who cannot distinguish the brand colors.

4. **Accessibility and responsive behavior**
   - Verify and adjust text, icon, focus, selected, and disabled states so applicable brand-colored controls meet WCAG contrast expectations; do not use brand color as the sole communication channel.
   - Add appropriate accessible names, descriptions, roles, and state announcements for demo controls, selector controls, loading, errors, compliance findings, and payload visibility.
   - Maintain usable layout and interaction at mobile, tablet, and large desktop widths, including the Live Demo phone controls and RCS preview/payload presentation.
   - Remain usable at browser zoom levels up to 200% without clipped content, hidden keyboard focus, or required horizontal scrolling for ordinary controls.
   - Respect `prefers-reduced-motion`, disabling or reducing nonessential animations/transitions while preserving state and status communication.

5. **Compatibility and validation**
   - Preserve existing successful flows and supported schemas/APIs unless a compatibility-preserving extension is required for the new capabilities.
   - Add focused automated coverage for changed state persistence/reset, compliance rules, payload generation, selector semantics/state, and critical responsive or accessibility behavior where existing test conventions support it.
   - Validate with the repository’s applicable type, lint, build, and unit/integration checks, plus targeted browser verification when available; document any browser checks that cannot run.

## Non-Functional Requirements

- **Accessibility:** The implementation must be operable without a mouse, expose semantic state to assistive technology, preserve visible focus, and avoid color-only meaning. Contrast and reduced-motion behavior must be considered for every newly changed state.
- **Responsive robustness:** Content must reflow rather than overlap or overflow across the stated viewport and zoom ranges. Long user-provided text and arbitrary phone input must be treated as normal inputs.
- **Reliability and safety:** Loading, failure, reset, and validation states must be deterministic and recoverable where the operation permits. User input must be validated before it reaches rendering or payload output.
- **Maintainability:** Reuse existing project patterns and components; avoid unnecessary dependencies and keep changes limited to relevant controls, headers, demo, schema/store/renderer, server, and tests.
- **Compatibility:** Do not regress existing message previews, navigation, supported channel selection, or current server boundaries. Do not commit changes as part of this work.

## Acceptance Criteria

1. On opening or refreshing the Live Demo, users can see when it is loading, receive a clear non-raw error if initialization or a supported action fails, and recover using the available retry/normal interaction path when recovery is possible.
2. Clicking **Reset demo** restores the initial scenario, phone/input state, messages, statuses, and transient errors; arbitrary user-entered phone numbers remain supported and no stale fixed-test-phone instruction is displayed.
3. Changing the scenario or phone state, navigating to another app view, and returning restores those values; a fresh session still receives valid defaults.
4. The Live Demo visibly identifies whether it is simulated/demo mode, and phone preview controls remain labeled, reachable, and usable at narrow/mobile widths.
5. A valid RCS configuration can render at least one rich card, a carousel, suggested replies/actions, typing status, and delivery/read states without breaking existing previews; images preserve their configured aspect-ratio behavior and long text wraps without horizontal overflow.
6. Invalid or unsupported RCS configurations produce compliance findings that identify the problem and severity, prevent or clearly qualify invalid rendering/payload output, and do not crash the editor or preview.
7. Users can reveal an optional payload/JSON representation for the current valid RCS configuration, and the representation updates with the configuration or clearly reports why it is unavailable.
8. Branded selectors fill the button surface with their intended brand/product colors and logos, while selected/unselected states remain distinguishable through non-color cues and include concise explanatory text or tooltip content.
9. Selector logos and controls have correct accessible names/semantics; the selector group exposes radio semantics where applicable, keyboard users can move and activate choices, and focus is visibly identifiable.
10. At mobile, tablet, desktop, and 200% zoom, the demo, selectors, preview, compliance findings, and optional payload view remain readable and operable without clipped controls or unintended horizontal overflow.
11. Changed controls meet applicable WCAG contrast expectations, preserve meaning in the neutral fallback treatment, and reduce nonessential motion when `prefers-reduced-motion` is enabled.
12. Focused automated checks and repository type/lint/build/unit checks pass, and targeted browser verification results (or explicit limitations) are recorded without modifying unrelated in-progress work.

## Out of Scope

- Building a production messaging transport, real provider integrations, delivery guarantees, or authentication.
- Claiming official provider certification or implementing every provider-specific RCS feature beyond the supported configuration and compliance rules.
- Replacing the application’s navigation architecture or introducing server-side, cross-device, or long-term persistence unless already required by existing boundaries.
- Redesigning unrelated screens, changing unrelated schemas/APIs, removing existing supported behavior, or resolving unrelated edits.
- Adding broad visual redesigns, analytics, localization, or new third-party dependencies without a demonstrated requirement.
- Committing or pushing repository changes.
