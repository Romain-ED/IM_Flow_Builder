# CLAUDE.md — internal notes for future sessions

This file is for whoever (human or Claude) picks this repo up next. The
README and in-app Manual are the *public* docs — keep both in sync with
any change described here. This file is for **decisions, gotchas, and
conventions that aren't obvious from reading the code**.

## What this is

"Business Messaging Flow Simulator" — a client-only React/TS/Vite app that
plays back JSON/YAML-authored conversation flows as a realistic phone UI,
rendered per-channel (RCS / WhatsApp / Generic). No backend, no real
message delivery. Built entirely in Claude Code sessions; see the
Manual's Changelog tab (`src/app/changelog.ts`) for the full feature
history — that's more current than anything written here.

## Architecture (read this before changing anything)

Strict layering, enforced by convention not tooling:

```
schema/    Zod discriminated unions — the ONLY source of truth for message
           shapes, both validation and TS types. Adding a message type
           means adding a schema variant here first.
engine/    Pure, timer-free functions (computeNodePlan, flowValidator,
           flowGraph, templateRenderer, conditionEvaluator). No React, no
           wall-clock timers, no side effects. Fully unit-testable.
store/     The ONE place that turns an engine plan into real timed
           playback (Zustand). Fast mode, pause/resume, back/restart via
           snapshots, localStorage persistence all live here.
channels/  Per-channel capabilities (capabilities.ts: which message types
           + what structural limits) and renderers (header/chrome only).
           Content components are channel-agnostic; only chrome +
           capability rules differ per channel.
messages/  One component per message type, dispatched by
           MessageRenderer.tsx's switch. No scenario-specific logic here.
components/ Phone chrome, sidebar controls, flow inspector, Scenarios/
           Manual pages.
```

The engine never imports React. No message component hardcodes a specific
scenario's content. Adding a scenario = adding a YAML file; adding a
message type = schema variant + renderer component + one `case` in
`MessageRenderer.tsx` — nothing else should need to change (see the "add
a message type" checklist in the README if it does).

## Official vs. invented message types — the most important open decision

The three built-in scenarios (`src/scenarios/*.yaml`) were audited against
the real WhatsApp Cloud API (interactive messages guide, interactive
message templates, commerce/product-sharing guide) and Google's RCS
Business Messaging spec, and rewritten to use **only types with a real
platform equivalent**. This was a deliberate, user-directed rewrite — see
the CHANGELOG entries for the exact commit and rationale.

**Verified official** (keep using these; they map to a real payload):
- `text`, `image`/`video`/`document`, `location` — direct equivalents on
  both platforms.
- `rich_card` ≈ a real WhatsApp interactive message (header image + body +
  footer + up to 3 buttons) and a real RCS rich card.
- `carousel` ≈ WhatsApp's **Carousel Template** (Meta-approved, up to 10
  cards, **2 buttons per card**) and a real RCS carousel (2–10 cards,
  **4 buttons per card**). Don't confuse the WhatsApp and RCS button caps —
  they're genuinely different (`maxCarouselCardButtons` in
  `capabilities.ts`).
- `suggested_replies` ≈ WhatsApp reply buttons (max 3) / RCS suggestion
  chips (max 11).
- `list` — real on WhatsApp (native list picker). **RCS has NO list/menu
  type at all** — Google's spec only defines text / file / rich card
  content. `list` is intentionally absent from RCS's `supportedMessageTypes`
  (this was a real bug: it used to be listed as supported with a dead,
  unreachable fallback note — fixed).
- `product_catalog` ≈ WhatsApp catalog/multi-product message.
- `whatsapp_flow` ≈ real WhatsApp Flows (`interactive.type: "flow"`) —
  correctly WhatsApp-only.
- `system_action`, `typing`, `delay` aren't message types at all and don't
  need to be — `system_action` represents a local device/app action (not
  sent by the business), `typing`/`delay` are pseudo-messages never stored
  in history. They don't violate "official types only" because they never
  claimed to be a platform message.

**No official basis on any platform** (still in the schema for custom
scenarios, but the built-in demos no longer use them — see fallback notes
in `channels/*/capabilities.ts` for the honest "here's what a real
integration would send instead" explanation):
- `flight_card`, `boarding_pass` → real equivalent is `document` (PDF) +
  `text` summary + `suggested_replies`.
- `otp` → the segmented code-*entry* UI is invented; WhatsApp's real
  pattern is an Authentication Template: fixed text + a **Copy Code**
  button. The code is never typed back into the chat.
- `payment_request` → real equivalent is a `rich_card` with an `open_url`
  button (opens an external payment link).
- `calendar_event` → real equivalent is plain `text` + a `suggested_replies`
  "Add to calendar" option.

**Don't delete these types/components.** They're legitimate as *simulator
extensions* for someone prototyping a business story that doesn't map
cleanly to a real primitive — just be honest about it (fallback notes
already do this) and don't add new ones without the same rigor (verify
against a real doc, not vibes).

`suggested_actions`' `call`/`location`/`calendar`/`custom` action subtypes
are a known lower-priority gap: only `reply`/`open_url` are genuinely
official WhatsApp button actions. Not fixed yet — flagged in
`capabilities.ts` comments, low priority since it's a nested field, not a
top-level message type.

## `getCapabilityWarning` — the enforcement mechanism

`channels/capabilities.ts` declares real numeric/length limits per channel
(sourced from the docs above, not guessed) and `getCapabilityWarning`
checks authored content against them live, surfaced via the same
inline amber note UI as `getFallbackNote` (`MessageRenderer.tsx`, gated by
"Show capability warnings" debug toggle). When adding a new structural
limit you've verified, add it to the `ChannelCapabilities` interface and
both channel files, then extend the switch in `getCapabilityWarning` —
don't just document a number without wiring the check (that was a real
bug: the original `max*` fields were declared but never enforced anywhere
until this was fixed).

## `node.actions` renders inline, not as a floating bar

`ActionBar.tsx` was **deleted**. A node's `actions:` (the lightweight way
to author a button row without writing a full `suggested_replies`
message) now renders as the last item inside `ConversationView`, attached
to the last message and scrolling with it — reusing the exact same
`ChoiceChips` + wrapper that a `suggested_replies` message uses. This was
a real bug fix: real WhatsApp/RCS always attach interactive buttons to
the one message that offered them; there's no "persistent bar above the
keyboard" pattern on either platform. **Don't reintroduce a pinned/fixed
action bar** — if you need to touch this, edit the trailing block in
`ConversationView.tsx`.

## Versioning — do this on every change

1. Bump `version` in `package.json`. Scheme (0.x, pre-1.0): middle number
   = new feature, last number = fix/infra-only.
2. Add an entry to the top of `CHANGELOG` in `src/app/changelog.ts`
   (newest first). This is what renders in the Manual's Changelog tab and
   is the best record of "what happened and why" for a future session —
   write it like you're leaving a note for yourself.
3. The version badge in `AppHeader.tsx` and the Manual header both read
   `APP_VERSION` from `src/app/version.ts` (sourced from `package.json`)
   automatically — no separate place to update.

## Git / deploy workflow

- Two branches matter: `claude/messaging-flow-simulator-wboec4` (primary
  dev branch) and `main` (kept fast-forwarded to match it after every
  push: `git branch -f main claude/messaging-flow-simulator-wboec4 && git
  push origin main`).
- **The GitHub Pages deploy workflow (`.github/workflows/deploy-pages.yml`)
  only triggers on push to `claude/messaging-flow-simulator-wboec4`, not
  `main`.** This is because the repo's Pages environment only allows
  deployments from the repository's actual **default branch**, which is
  still that feature branch (it was never changed to `main` when the repo
  was set up). Always push the feature branch — that's what actually
  deploys. If the default branch is ever changed in GitHub settings, this
  workflow's trigger needs to move to match it (or better, `main`, if it
  ever gets promoted to default).
- The repo was renamed `Vonage_test` → `IM_Flow_Builder` mid-session and
  made **public** (GitHub Pages requires a public repo on the free plan —
  it silently shows an "Upgrade or make public" message otherwise, easy
  to miss). If the repo is renamed again, update together: `vite.config.ts`
  (`base: '/IM_Flow_Builder/'`), `src/utils/assetUrl.ts` (comment only),
  README's Pages URL, and the git remote (`git remote set-url origin ...`
  — though GitHub's redirect makes pushes to the old URL keep working for
  a while, don't rely on that long-term).
- Live URL: `https://romain-ed.github.io/IM_Flow_Builder/`.
- If a GitHub MCP tool 403s on push after a rename, the session's git
  proxy has cached authorization under the old repo identity — call
  `add_repo` (Claude_Code_Remote MCP) for the new owner/repo to
  re-authorize; no need to actually clone anywhere, just re-push from the
  existing local checkout afterward.

## Verification checklist (every change, before commit)

```bash
npx tsc -b && npm run build && npm test && npx oxlint .
```
All four must be clean (the two long-standing oxlint warnings —
`ChannelContext.tsx` fast-refresh export warning,
`CustomScenarioEditorModal.tsx` exhaustive-deps — are known/accepted, not
new failures to chase). Then a **Playwright visual pass** for anything
UI-visible: `npm install -D playwright --no-save`, screenshot the actual
behavior, **always `npm uninstall playwright` immediately after** — it's
a temporary dev tool, never a committed dependency. Chromium is
pre-installed at `/opt/pw-browsers/chromium`; pass that as
`executablePath` when launching, don't run `playwright install`.

## Sandbox networking (this remote environment specifically)

Outbound HTTPS goes through a policy-enforcing proxy. `WebFetch`/`curl` to
arbitrary external domains — including `developers.facebook.com`,
`developers.google.com`, and even this project's own `github.io` Pages
site — are **blocked** (403 policy denial, not a bug, don't retry or try
to route around it). `WebSearch` still works for research (it doesn't go
through the same client-side proxy) and was how the WhatsApp/RCS spec
verification above was actually done — prefer it over assuming you
remember a spec correctly, especially for anything with specific numeric
limits.

## Where things are (quick index)

- Built-in scenarios: `src/scenarios/{singapore-airlines,ecommerce,restaurant}.yaml`,
  registered in `src/scenarios/index.ts`.
- Schema: `src/schema/messages.ts` (message types), `src/schema/flow.ts`
  (node/flow structure).
- Channel capabilities: `src/channels/{rcs,whatsapp,generic}/capabilities.ts`,
  shared logic in `src/channels/capabilities.ts`.
- Engine core: `src/engine/ConversationEngine.ts` (computeNodePlan — the
  pure "what happens when this node is entered" function).
- Store: `src/store/simulatorStore.ts` (single Zustand store, large file,
  organized by feature area with comments).
- Tests: colocated `*.test.ts` next to the thing they test; run all with
  `npm test`.
