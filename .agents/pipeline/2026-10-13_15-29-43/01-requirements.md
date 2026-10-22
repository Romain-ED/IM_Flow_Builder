# Requirements: Playable Video in the RCS Simulator

## Summary

Add playable video support to the simulator for RCS rich messaging. A valid authored `video` message must render as an HTML5 video player using the existing asset/path conventions, including the built-in Domino's campaign MP4 at `/assets/dominos-rcs-video-campaign/gemini_generated_video_1c89463b.mp4`. Playback must be initiated through normal user interaction and must not rely on a simulator-only toast or placeholder thumbnail interaction. Existing text, image, rich-card, carousel, and other message behavior must remain unchanged.

The repository already defines a `video` message shape (`url`, optional `thumbnailUrl`, `caption`, and `durationLabel`), loads the Domino's video campaign scenario, and resolves app-relative assets through the configured Vite base path. The primary requirement is therefore to make the existing video path genuinely playable and robust rather than introduce a separate authoring format.

**Assumptions:** “rich RCS messages” refers to the simulator’s authored RCS `video` message and its existing rich-message presentation, not a new transport payload or an arbitrary video upload workflow. The supplied MP4 is intended to remain a public static asset. Channel capability behavior outside RCS should not be broadened or changed unless required to preserve the current shared renderer behavior.

## Functional Requirements

- The simulator shall render an authored RCS message with `type: video` and a valid `url` as a playable HTML5 video element inside the existing message/card presentation.
- The player shall expose appropriate native playback controls and allow the user to start, pause, seek, and otherwise use standard browser-supported playback controls. Playback shall not require an unavailable simulator action or display only a static thumbnail.
- App-relative video URLs such as `/assets/dominos-rcs-video-campaign/gemini_generated_video_1c89463b.mp4` shall resolve through the same configured-base/public-asset convention as existing images and documents. Absolute HTTP(S) URLs shall continue to be accepted according to the existing message model and asset URL behavior.
- Optional authored metadata shall be preserved where applicable: `thumbnailUrl` may provide the player poster/preview, and `caption` and `durationLabel` shall continue to render without preventing playback. Missing optional metadata shall not prevent a valid video from rendering.
- Missing, empty, malformed, or load-failing video sources shall fail gracefully: the simulator must not crash, produce an unhandled error, or leave an unusable broken-player state without explanation. The message area shall retain a stable, readable fallback state and communicate that the video is unavailable; if a valid thumbnail exists, it may be used in that fallback.
- Read-only/presenter/shared-link behavior and existing interaction gating shall be respected: video playback controls must not create unrelated simulator side effects or enable flow navigation when the conversation is non-interactive, while a normal simulator viewer must be able to play a valid source.
- Existing rendering and interactions for text messages, standalone images, rich cards, carousels, captions, action buttons, and unrelated message types shall remain behaviorally and visually compatible, aside from any shared styling needed to accommodate the player.
- The built-in Domino's RCS video scenario shall remain loadable and shall use the supplied campaign MP4 path as its video source. The asset must be served by the application as a public resource and be usable by the browser as a video source.

## Non-Functional Requirements

- Accessibility: the player and any fallback must have an accessible name or associated text, preserve meaningful caption/alternative context, and remain keyboard-operable through native controls or an equivalent accessible interaction.
- Compatibility: use browser-native HTML5 video capabilities and the project’s existing React/TypeScript/Vite/Tailwind stack; do not require a new media service, third-party player, or dependency for basic playback.
- Resilience: asset URL resolution must continue to work when `VITE_BASE_PATH` is configured for a non-root deployment, and video load errors must be handled at the component boundary without uncaught runtime exceptions.
- Maintainability and testability: validation must cover the video component’s rendered source/controls and error fallback, plus the existing scenario/asset path. Existing message rendering tests or equivalent focused tests should protect against regressions in neighboring message types.

## Acceptance Criteria

1. Given the built-in Domino's RCS video campaign is loaded in the simulator, the campaign video message renders a native HTML5 video player whose source resolves to the configured application URL for `/assets/dominos-rcs-video-campaign/gemini_generated_video_1c89463b.mp4`.
2. In a normal interactive simulator view, a user can use visible/native controls to play and pause the valid MP4, seek when supported by the browser, and see the video content rather than a “playback is not available” placeholder or toast.
3. A valid `video` message without `thumbnailUrl` still renders and can be played; a valid message with `thumbnailUrl`, `caption`, and/or `durationLabel` preserves those optional presentation details without breaking playback.
4. When the video URL is missing, invalid, or returns a media-load error, the simulator remains usable, renders a stable explanatory fallback (with a valid thumbnail if available), and records no uncaught React/browser error that interrupts the conversation.
5. The rendered video/fallback has accessible labeling and is operable with keyboard-accessible browser controls; the caption or equivalent context is available to assistive technology when authored.
6. A non-interactive/read-only, presenter, or shared-link conversation does not trigger flow navigation, toast side effects, or other simulator state changes merely because the video is rendered or native controls are used; it still displays the video/fallback according to the view’s interaction policy.
7. Existing text, image, rich-card, carousel, action-button, and unrelated message tests or smoke checks continue to pass, and their rendered behavior is not replaced by video-specific fallback logic.
8. The project’s strongest available validation passes, including the applicable TypeScript/build, lint, and automated test commands; a browser/runtime smoke check confirms the MP4 URL responds successfully and the player can begin playback in the built or previewed application when browser automation is available.

## Out of Scope

- Adding video upload, transcoding, format conversion, streaming/CDN infrastructure, or server-side media processing.
- Changing the authored message schema beyond what is necessary to use the existing `video` message fields, or inventing a separate video authoring format.
- Changing RCS/WhatsApp transport payloads, channel capability limits, live-demo preflight rules, or external messaging-provider behavior.
- Redesigning existing text, image, rich-card, carousel, or general simulator styling beyond the focused media-player and fallback treatment.
- Autoplaying video, bypassing browser/user media policies, or adding custom playback controls that replace standard HTML5 controls without a demonstrated requirement.
- Modifying secrets, unrelated infrastructure, deployment configuration, or committing changes.
