# CLAUDE.md — internal notes for future sessions

README and the in-app Manual are the *public* docs; keep both in sync with changes here. This file holds **decisions, gotchas, and conventions not obvious from the code**.

Feature history and rationale live in docs/HISTORY.md; read it only when working on that specific feature.

## What this is

"Business Messaging Flow Simulator": React/TS/Vite simulator plus an opt-in VCR Node service for Live RCS. It plays JSON/YAML flows in an RCS/WhatsApp phone UI; Live RCS is off unless server-only config enables one allowlisted test-recipient session. See `docs/LIVE_RCS_DEMO.md`.

- The "Generic" channel (through 0.7.0) was removed in 0.8.0 at the user's request. Don't reintroduce a generic channel unless asked. Details: docs/HISTORY.md#what-this-is

## Architecture (read this before changing anything)

Strict layering by convention: `schema/` (Zod unions, the ONLY source of message shapes/types; add a variant here first) → `engine/` (pure, timer-free, no React: computeNodePlan, flowValidator, flowGraph, templateRenderer, conditionEvaluator) → `store/` (the ONE place engine plans become timed playback; Zustand: pause, back/restart snapshots, localStorage) → `channels/` (per-channel `capabilities.ts` + header/chrome renderers) → `messages/` (one component per type, dispatched by a switch in `MessageRenderer.tsx`) → `components/` (chrome, sidebar, inspector, pages).

- The engine never imports React. No message component hardcodes scenario content.
- New scenario = a YAML file. New message type = schema variant + renderer + one `case` in `MessageRenderer.tsx`; nothing else should change.
- Original: docs/HISTORY.md#architecture

## Official vs. invented message types — the most important open decision

Built-in scenarios use **only types with a real WhatsApp Cloud API / Google RCS equivalent**; none may show the "not officially supported" note. User-directed rewrite (Beerlao `otp` → `input`). Never add a type with no real basis to a built-in; removed twice already.

- Official: `text`, `image`/`video`/`document`, `rich_card`, `carousel` (WhatsApp 2 buttons/card, RCS 4; `maxCarouselCardButtons`; don't confuse), `suggested_replies` (WhatsApp 3 / RCS 11), `list` (WhatsApp only; **RCS has NO list type**, keep it out of RCS `supportedMessageTypes`), `product_catalog`, `whatsapp_flow` (WhatsApp only). `system_action`/`typing`/`delay` aren't platform messages.
- No official basis (schema only, never in built-ins): `flight_card`, `boarding_pass` (real: `document`+`text`+`suggested_replies`), `otp` (real: Authentication Template with Copy Code; code never typed back), `payment_request` (real: `rich_card`+`open_url`), `calendar_event` (real: `text`+`suggested_replies`). **Don't delete these types/components**; they are honest simulator extensions (fallback notes in `channels/*/capabilities.ts`). Add new ones only after verifying a real doc.
- `suggested_actions` `call`/`location`/`calendar` are native RCS, but the Live adapter maps only `reply`/`open_url`; `custom` is simulator-only (`docs/RCS_SPEC_REFERENCE.md`).
- Guard: `scenarios.test.ts` fails if a built-in type is in **neither** channel's `supportedMessageTypes` (OR, not AND; don't make it stricter). `typing`/`delay` exempt. The authoring guide must keep saying `input`, not `otp`. Details: docs/HISTORY.md#guard-0121, docs/HISTORY.md#official

## Enforcement mechanisms (know these before editing)

### `getCapabilityWarning` (advisory, soft)
`channels/capabilities.ts` declares real per-channel limits (from docs, not guessed); `getCapabilityWarning` checks content live (inline amber note, "Show capability warnings"). A new verified limit goes into `ChannelCapabilities`, both channel files, AND the `getCapabilityWarning` switch; never document a number without wiring it.

### `normalize.ts` hard validation (0.8.0)
- `channels/{whatsapp,rcs}/normalize.ts` mirror each platform's real payload and return hard errors; `validateChannelCompliance.ts` makes `[WhatsApp]`/`[RCS]` issues. **Use `validateFlowWithChannelCompliance`, never `validateFlow` directly**, wherever scenario loading is gated. Don't move it into `engine/flowValidator.ts` (engine can't depend on channels/).
- Only count/structural checks (button counts, missing body, carousel size) are hard errors; length limits stay soft (`{{variables}}` vary). **Don't make "unsupported type" a hard error.**
- RCS ownership is deliberately broader than WhatsApp's (suggestions may follow any RCS content message; WhatsApp needs body `text`). `rcs/normalize.ts` has its own predicate; don't unify with `isAttachableOwner` (`engine/messageAttachment.ts`).
- A `rich_card`/`carousel` followed by `suggested_*` needs a short `text` between them or WhatsApp load fails; a node opening with bare `suggested_*` usually needs a preceding `text`.
- Details: docs/HISTORY.md#normalize-080

### `node.actions` renders inline (never a pinned bar)
- `ActionBar.tsx` was deleted. **Don't reintroduce a pinned/fixed action bar.**
- Attach decision: `engine/messageAttachment.ts` (`computeMessageAttachments`, pure). Wiring: `ConversationView.tsx`. Footer: `MessageShell.tsx` (`trailingActions`).
- Attach only for `'stacked'` chips (WhatsApp) when the last message is business `text`; RCS chips deliberately stay a separate pill row. Decide explicitly per new `chipStyle`. `RichCard`/`Carousel` keep `actions` in their own card.
- Details: docs/HISTORY.md#node-actions

## Feature rules (invariants; rationale in docs/HISTORY.md)

- **AI authoring (0.9.0):** keep hand-maintained `docs/SCENARIO_AUTHORING_GUIDE.md` (imported via `?raw`) in sync with `schema/*.ts` and `channels/*/capabilities.ts`. BYO Anthropic key, client-side only; VCR must never see it. Retry exactly once. No test uses the network. Details: docs/HISTORY.md#ai-090
- **Brand editing (0.10.0):** `configuredBrand` mirrors `configuredVariables`; edits apply immediately, no "Hit Restart" caveat. Details: docs/HISTORY.md#brand-0100
- **Free text (0.11.0):** composer submits go through `handleFreeText`; `flow.triggers` win even over an active `input`; **no "didn't understand" auto-reply**; whole-word `matchTrigger`. Details: docs/HISTORY.md#free-text-0110
- **`rich_card`/`list` header/footer (0.13.0):** WhatsApp-only (gated on `channel`); `rich_card` header is text OR image, never both (hard error). Details: docs/HISTORY.md#header-footer-0130
- **`input` (0.15.1):** plain unannotated text; no icon, colour, hint. Details: docs/HISTORY.md#input-0151
- **Formatting (0.16.0):** `FormattedText` for prose fields only (not titles, headers, button labels, `document`). **Never nest `**_x_**`.** Details: docs/HISTORY.md#formatting-0160
- **Phone sizing (0.16.1):** `.phone-viewport`/`.phone-frame-fit` keep 9:19; Compare mode's 260px columns stay unchanged unless asked. Details: docs/HISTORY.md#phone-sizing-0161
- **Pro Gadget Laos (0.15.0/0.16.3):** copy from a real spec PDF; real Garmin CIRQA; `product_launch` is a promo. No "new arrival" without a second real product. Details: docs/HISTORY.md#progadget-0150, docs/HISTORY.md#progadget-0163
- **Beerlao assets (0.13.1):** pasted chat images are unreachable; have the user commit binaries to `public/assets/`; run `file <path>` if one misbehaves. Leave unreferenced `public/assets/38198693_*.jpg` alone; ask first. Details: docs/HISTORY.md#beerlao-assets-0131

## Shared-link mode (0.14.0)

`sharedLinkMode` is a non-togglable viewer (phone, Restart, iOS/Android switch only), stricter than `presenterMode`; `App.tsx` checks it first. Never persisted. Add `&& !sharedLinkMode` wherever `presenterMode` hides debug chrome. Don't grow `SharedLinkFloatingControls.tsx` unless asked. Details: docs/HISTORY.md#shared-link-0140

### Read-only is enforced in code (0.19.0)
Hiding buttons isn't the guarantee:
- `sharedLinkMode` is initialised **synchronously** from `hasShareHash()` at store creation, so the editor never renders. Any `#flow=`, `#s=` or `#scenario=` key counts, even if empty.
- `lockStorageWrites()` (persistence.ts) makes every `save*`/`clear*` a no-op; saved visitor data is never read.
- Every editing/config store action starts with `isLocked()` and returns. `initialize()` loads the shared flow via `loadingSharedFlow`, a closure flag that briefly lifts the lock. **If you add a store action that edits scenarios, brand, variables or preferences, add the `isLocked()` guard.**
- Bad payloads set `sharedLinkError`; `App.tsx` shows only that.
- Links (`platform` = starting phone only): `#scenario=<built-in id>` (unmodified built-in), `#s=<id>` (short, server-stored, permanent), `#flow=<z.|r.payload>` (long, back-compat + fallback when the POST fails). All resolve via `readSharedSource()` in `utils/shareLink.ts` into the same `loadScenarioSource()`. Decoded size cap 2 MB.
- Short links: `server/shareLinks.js` (`POST /api/share`, `GET /api/share/:id`, unauthenticated write → size/rate/dedupe/budget limits) over `server/shareStore.js` (VCR **account** state; instance state/disk/memory are not durable and must not be used; `SHARE_STORE_PATH` is local-dev only). Tests: `server/shareLinks.test.js`.
- Tests: `src/store/sharedLinkMode.test.tsx` (uses `vi.resetModules()`).

## Versioning — do this on every change

1. Bump `version` in `package.json` (0.x: middle = new feature, last = fix/infra-only).
2. Add an entry at the top of `CHANGELOG` in `src/app/changelog.ts` (newest first; renders in the Manual's Changelog tab). Write it as a note to self.
3. `AppHeader.tsx` and the Manual header read `APP_VERSION` (`src/app/version.ts`) automatically.

## Git / deploy workflow

- Branches: `claude/messaging-flow-simulator-wboec4` (dev) and `main` (fast-forward after every push: `git branch -f main claude/messaging-flow-simulator-wboec4 && git push origin main`).
- **Vonage Cloud Runtime (VCR) is the primary deployment target.** `npm run deploy` invokes the VCR CLI. Manifest `vcr.yml`, build step `build.sh`, application ID `0ba99fd4-3f1f-45f9-b8a3-8a76ecf9ebe2`.
- VCR serves at the domain root, so `vite.config.ts` defaults to `base: '/'`. Entrypoint `server/index.js` must keep listening on `VCR_PORT` and serving `GET /_/health`.
- `.vcrignore` excludes local-only files. Never add secrets, `.env` files, or `node_modules` to the VCR package.
- If a GitHub MCP push 403s after a rename, call `add_repo` (Claude_Code_Remote MCP) for the new owner/repo, then re-push.

## Verification checklist (every change, before commit)

```bash
npx tsc -b && npm run build && npm test && npx oxlint .
```
All four must be clean (two known oxlint warnings accepted: `ChannelContext.tsx` fast-refresh export, `CustomScenarioEditorModal.tsx` exhaustive-deps). For UI-visible changes do a **Playwright visual pass**: `npm install -D playwright --no-save`, screenshot, **always `npm uninstall playwright` right after**. Chromium is at `/opt/pw-browsers/chromium` (pass as `executablePath`; don't run `playwright install`).

## Sandbox networking (this remote environment specifically)

Outbound HTTPS goes through a policy proxy: `WebFetch`/`curl` to arbitrary domains (incl. `developers.facebook.com`, `developers.google.com`, the project's `github.io`) are **blocked** (403; don't retry or bypass). `WebSearch` works; prefer it over memory for numeric spec limits.

## Where things are (quick index)

- Built-in scenarios: `src/scenarios/{singapore-airlines,ecommerce,restaurant,beerlao,progadget-laos}.yaml`, registered in `src/scenarios/index.ts`.
- Schema: `src/schema/messages.ts` (types), `src/schema/flow.ts` (nodes/flow).
- Channels: `src/channels/{rcs,whatsapp}/{capabilities,normalize}.ts`, shared `src/channels/capabilities.ts`.
- Engine core: `src/engine/ConversationEngine.ts` (computeNodePlan).
- Store: `src/store/simulatorStore.ts` (single large Zustand store).
- Tests: colocated `*.test.ts`.

## Live RCS guardrails (0.14.0)

The VCR Node server is part of the production deployment. It must keep serving `GET /_/health`, static assets, and SPA fallback while preserving the isolated Live RCS namespaces: `GET /api/live/diagnostics`, authenticated `/api/live/*`, and `POST /webhooks/vonage/*`.

Live delivery is **off by default**. Never expose or persist Vonage JWTs, webhook secrets, RCS sender IDs, test recipient numbers, or `LIVE_RCS_OPERATOR_TOKEN` in client/source/scenario/localStorage. Recipient and flow allowlist are server-side. `server/liveDemo.js` deliberately fails closed for unverified Vonage rich-content payloads; do not replace that guard with guessed card/carousel JSON. Add a reviewed provider mapping plus redacted fixtures only after consulting the authenticated application reference. Keep `docs/LIVE_RCS_DEMO.md`, README, and the in-app changelog current.
