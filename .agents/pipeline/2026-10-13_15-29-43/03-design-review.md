# Design Review: Playable Video in the RCS Simulator

## Findings

1. **MEDIUM — Live preflight and server URL validation are not the same contract.**
   - **Location:** `02-design.md`, “Presenter/live projection and server boundary” and “Error handling”; implementation point `src/live/rcsPreflight.ts:resolvePublicUrl()`.
   - **Problem:** The design describes the new server validator as defense in depth for an “already-stricter” preflight. The actual preflight uses `new URL(source, publicBaseUrl)` and accepts a protocol-relative source such as `//cdn.example/video.mp4` as an HTTPS URL. `LiveRcsControls` treats that preflight as successful and lets the user start; the server would then reject it only after session creation has begun, leaving the session in its error path. This produces inconsistent validation and delayed failure rather than a single predictable content error.
   - **Concrete fix:** Choose one contract and apply it at both boundaries. Prefer a shared pure validator (or equivalent duplicated rules) that rejects empty/control-character, protocol-relative, non-root-relative, and unsupported-scheme values in `preflightLiveRcsFlow()` and `server/liveDemo.js`. Add a preflight test for `//cdn.example/video.mp4`, `javascript:...`, and an empty URL, and retain the server test asserting zero gateway calls. If protocol-relative URLs are intentionally permitted by preflight, remove the “already-stricter” claim and specify that the UI may pass while server creation returns a controlled validation error.

2. **MEDIUM — The base-path runtime smoke test requires a URL that is not expected to work in a non-root deployment.**
   - **Location:** `02-design.md`, “Asset, styling, and build integration” and “Validation and runtime smoke test”.
   - **Problem:** The design says a `VITE_BASE_PATH=/simulator/` build should resolve the MP4 to `/simulator/assets/...`, but also says the smoke test will request both `/assets/...` and the base-prefixed URL and check successful responses. In a non-root deployment, `/assets/...` is the unprefixed URL and can legitimately be a 404; the existing `assetUrl()` contract intentionally prefixes it. The two acceptance expectations conflict.
   - **Concrete fix:** Define separate checks: for the default-root build, request `/assets/dominos-rcs-video-campaign/gemini_generated_video_1c89463b.mp4`; for the base-path build, request only `/simulator/assets/dominos-rcs-video-campaign/gemini_generated_video_1c89463b.mp4` (or construct `${BASE_URL}assets/...`). Assert the rendered `video.src` uses exactly one configured base prefix. Do not require the unprefixed URL to succeed in the base-path deployment.

3. **MEDIUM — The proposed stricter server resolver has an unspecified impact on existing non-video live media.**
   - **Location:** `02-design.md`, “Presenter/live projection and server boundary”, especially the `resolveMediaUrl()` contract; implementation point `server/liveDemo.js:collectContent()`.
   - **Problem:** The current `resolveMediaUrl()` is shared by `image`, `video`, `document`, `rich_card`, and `carousel` branches. Replacing it with the described strict resolver will therefore change behavior for existing live images, documents, rich-card images, and carousel images, despite the requirement that existing image and neighboring message behavior remain unchanged. The design never states whether the strict rules apply to every branch or only the new video source/poster path.
   - **Concrete fix:** Either (a) introduce a video-specific `resolveLiveVideoUrl()` and leave the existing resolver/behavior for unrelated message types, or (b) explicitly declare the stricter policy as an intentional cross-media hardening change and add regression tests for every existing branch, including root-relative and absolute URLs. In either case, specify whether an invalid optional video thumbnail is dropped while an invalid primary URL is fatal, without relying on the phrase “both media URLs.”

4. **NIT — The player sizing and object-fit contract is underspecified.**
   - **Location:** `02-design.md`, “RCS rendering and interaction”.
   - **Problem:** The design fixes a `relative block h-48 w-full overflow-hidden` media region but does not specify the classes/style on the `<video>` element itself. A browser-native video with no width/height styling can retain its intrinsic dimensions and not fill the existing card media region, causing clipping or a visual regression relative to the current full-size thumbnail.
   - **Concrete fix:** Specify the exact media styling, for example `className="block h-full w-full object-cover"` (or explicitly choose `object-contain` and the expected background treatment), and apply the same region sizing to the fallback. Add a render assertion for the class or a browser smoke check for the media bounds.

## Verified Assumptions

- `src/schema/messages.ts` already defines `video` with optional `url`, `thumbnailUrl`, `caption`, and `durationLabel`; no new authoring shape is needed.
- `ConversationEngine` calls `deepInterpolate()` on the complete authored message object, so `url`, `thumbnailUrl`, caption, and duration metadata can reach the renderer after interpolation.
- `src/messages/MessageRenderer.tsx` already passes `channel`, `interactive`, and `timestampLabel` to `VideoMessage`; the existing video component currently uses a thumbnail button and the simulator toast.
- `src/utils/assetUrl.ts` applies `import.meta.env.BASE_URL` once to root-authored paths and leaves absolute/protocol-relative values unchanged. `vite.config.ts` uses `VITE_BASE_PATH` as Vite’s `base`.
- The Domino’s scenario is registered in `src/scenarios/index.ts`, contains the exact `/assets/dominos-rcs-video-campaign/gemini_generated_video_1c89463b.mp4` value, and the MP4 exists at `public/assets/dominos-rcs-video-campaign/gemini_generated_video_1c89463b.mp4`.
- `ImageWithFallback` currently owns the image-side `assetUrl()` call, so passing it a raw validated thumbnail is compatible with the proposed single-resolution ownership rule.
- `ConversationView` marks live sessions read-only and suppresses flow actions/trailing actions in that mode; the current video component’s toast is the only video-specific side effect to isolate from the RCS branch.
- `server/vonageRcs.js` serializes a video using only `video.url` and optional caption, so presenter-only thumbnail and duration metadata can remain out of the provider payload.
- `projectLiveSnapshot()` currently validates timeline items through a separate live schema and then the normal `messageSchema`, so adding bounded optional video metadata at that boundary is feasible.

## Unverified/Wrong Assumptions

- **Wrong:** The design’s statement that the existing Live RCS preflight is already stricter than the proposed server validator is false for protocol-relative URLs. `new URL('//host/path', 'https://base')` produces an accepted HTTPS URL in the current preflight.
- **Unverified:** The design says the media URL tests will use the repository’s “Vite/Vitest environment mechanism” to exercise `BASE_URL=/simulator/`, but `vitest.config.ts` only declares the jsdom environment and setup file; it defines no project-specific base-path test mechanism. The design must name the mechanism (for example, a supported `vi.stubEnv` approach or a separately documented build-level assertion) and ensure it actually affects `assetUrl()`.
- **Wrong/ambiguous:** A non-root deployment cannot be assumed to serve both the unprefixed root asset URL and the base-prefixed asset URL successfully. The smoke-test requirement must distinguish root and base-path builds as described in finding 2.
- **Unverified:** The design claims unchanged behavior for all neighboring message types while proposing a shared server URL resolver change. The current shared call sites make that claim unverified until the scope is narrowed or regression coverage is specified.

**Verdict: CHANGES_REQUESTED**
