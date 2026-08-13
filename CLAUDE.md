# CLAUDE.md — internal notes for future sessions

This file is for whoever (human or Claude) picks this repo up next. The
README and in-app Manual are the *public* docs — keep both in sync with
any change described here. This file is for **decisions, gotchas, and
conventions that aren't obvious from reading the code**.

## What this is

"Business Messaging Flow Simulator" — a client-only React/TS/Vite app that
plays back JSON/YAML-authored conversation flows as a realistic phone UI,
rendered per-channel (RCS / WhatsApp). No backend, no real message
delivery. Built entirely in Claude Code sessions; see the Manual's
Changelog tab (`src/app/changelog.ts`) for the full feature history —
that's more current than anything written here.

A third "Generic" channel existed through 0.7.0 and was removed in 0.8.0
at the user's explicit request, once the goal shifted to matching the
real WhatsApp/RCS platforms as closely as possible — a channel-neutral
fallback renderer worked against that goal. If you're tempted to
reintroduce a generic/neutral channel, don't, unless the user asks again.

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

All four built-in scenarios (`singapore-airlines.yaml`, `ecommerce.yaml`,
`restaurant.yaml`, `beerlao.yaml`) were audited against the real WhatsApp
Cloud API (interactive messages guide, interactive message templates,
commerce/product-sharing guide) and Google's RCS Business Messaging spec,
and use **only types with a real platform equivalent** — none of them
should ever show the "not officially supported" capability-warning note
on WhatsApp or RCS. This was a deliberate, user-directed rewrite — see the
CHANGELOG entries for the exact commit and rationale. `beerlao.yaml`
initially used the simulator-only `otp` segmented-entry component for its
code-verification step and did show that warning; the user explicitly
asked for it to be removed, so it was swapped for `input` instead — same
typed-code-with-validation behavior (wrong code → error → retry loop),
but `input` renders as a plain text bubble backed by the ordinary
composer, which real WhatsApp genuinely has, so it carries no warning.
If you're tempted to add a message type that has no real WhatsApp/RCS
basis to any built-in scenario, don't — that's exactly what this rewrite
removed, twice now.

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

## Automated guard against built-ins regressing to invented types (0.12.1)

The Beerlao `otp`→`input` fix (see the CHANGELOG's 0.12.1 entry) happened
because nothing actually *enforced* the "built-ins only use official types"
rule above — it was a promise kept by memory alone, and it broke the first
time a scenario was added without re-deriving it. After the user explicitly
asked that the tool never again allow/invent unsupported types in a
built-in, `src/scenarios/scenarios.test.ts` gained a second describe block,
`built-in scenarios use only officially-supported message types`, that
walks every node of every `BUILT_IN_SCENARIOS` entry and fails the test
suite if any message's `type` is absent from **both**
`whatsappCapabilities.supportedMessageTypes` and
`rcsCapabilities.supportedMessageTypes` (i.e. one of the 5 "no official
basis on any platform" types — `otp`, `flight_card`, `boarding_pass`,
`payment_request`, `calendar_event`). `typing`/`delay` are exempted (pseudo-
messages, never passed through `isMessageTypeSupported` at render time
either).

**Deliberately not "supported on both channels"**: the check uses OR across
the two capability lists, not AND. `list` (WhatsApp-only, real native list
picker) and `whatsapp_flow` (WhatsApp-only by definition) are genuine
single-platform official types — they correctly still show an honest
fallback note when a built-in is cross-viewed on the *other* channel via
the sidebar's channel toggle, and that's accurate platform-difference
reporting, not a bug to chase away. An earlier draft of this test required
both channels and immediately (correctly) failed on `list`/`whatsapp_flow`/
`input` — don't reintroduce that stricter version; it would force every
built-in message into the intersection of WhatsApp's and RCS's primitives,
which is not what "officially supported" means here.

**This also caught a second, pre-existing bug** while being written:
`rcsCapabilities.supportedMessageTypes` incorrectly listed `calendar_event`
as RCS-native — checked against Google's RCS docs (`AgentContentMessage` is
text/file/rich-card only; a calendar event is a *suggested action* subtype,
`CreateCalendarEventAction`, not a standalone content message), so it was
removed and given the same honest `fallbackNotes.calendar_event` entry
WhatsApp already had. No built-in used it, so this was a latent gap, not a
visible regression — but it means a custom scenario using `calendar_event`
on RCS is now correctly flagged instead of silently rendering as if it were
real.

**`docs/SCENARIO_AUTHORING_GUIDE.md` had the same misconception baked into
the AI system prompt**: it listed `input` under "Simulator-only types — no
official WhatsApp/RCS payload equivalent," which is what the Beerlao bug
itself disproved — `input` is real on WhatsApp. Since this file *is* the
system prompt for `aiScenarioGenerator.ts` and the "copy prompt" fallback,
leaving it wrong meant the AI-authoring path was being steered toward
`otp` for exactly the "typed code with validation" case it should reach for
`input` instead. Moved `input` into the official-types section with a
worked example, and reworded the simulator-only section to explicitly say
"a generic request like 'add an OTP step' must use `input`, not `otp`" —
don't undo this pairing if you touch that file again.

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

## Real-payload-shaped hard validation (`normalize.ts`, 0.8.0)

`getCapabilityWarning` above is *advisory* — content still renders with an
amber note. On top of that, `channels/whatsapp/normalize.ts` and
`channels/rcs/normalize.ts` each define a `WhatsAppNormalizedMessage` /
`RcsNormalizedMessage` type mirroring that platform's actual payload shape
(Meta's Cloud API interactive-message shape; Google's `AgentMessage`
text/file/rich-card model) and a `normalize*(messages)` function that
walks one node's raw authored messages and either builds one of these or
returns a hard error. `channels/validateChannelCompliance.ts` runs both
normalizers over every node and turns errors into `[WhatsApp]`/`[RCS]`-
prefixed `ValidationIssue`s, composed with `engine/flowValidator.ts`'s
structural checks via `validateFlowWithChannelCompliance` — **use this**,
not `validateFlow` directly, at every call site that gates scenario
loading (store, the two scenario editor/preview modals, `flowSource.ts`
already do). A flow that's structurally fine but violates a real
WhatsApp/RCS limit now fails to load at all, same as a dangling `next`
reference — this is what "matches the real platforms" means in practice:
non-compliant content can't even load, not just render with a note.

**Why this isn't in `engine/flowValidator.ts`**: that would make
`engine/` depend on `channels/` (for `ChannelCapabilities`), backward from
this file's documented layering (`schema/ → engine/ → store/ → channels/
→ ...`). `engine/flowValidator.ts` stays pure and channel-agnostic;
`channels/validateChannelCompliance.ts` is the composing layer, since
channels/ is allowed to depend on engine/, not the reverse.

**Scope, deliberately**: only count/structural checks (button counts,
missing body text, carousel size) are hard errors — they don't depend on
variable values. *Length* limits (label/title/description length) stay
`getCapabilityWarning`'s live soft check, since a `{{variable}}` can
change a length per run and this validation happens once at load time,
pre-interpolation. Also deliberately NOT validated here: using a message
type a channel has no official basis for at all (`otp`,
`payment_request`, etc.) — that's an intentional, already-handled soft
fallback (`supportedMessageTypes` + `getFallbackNote`), not a structural
violation of a type the channel claims to support. Don't make "unsupported
type" a hard error — that would break the legitimate simulator-extension
use case described earlier in this file.

**RCS's ownership rule is broader than WhatsApp's, on purpose**: a
`suggested_replies`/`suggested_actions` message may attach to *any*
preceding RCS content message (text, image/video/document, rich_card,
carousel) — Google's `AgentContentMessage` allows suggestions on any of
these. WhatsApp requires body **text** specifically. `rcs/normalize.ts`
defines its own broader ownership predicate rather than reusing
`engine/messageAttachment.ts`'s `isAttachableOwner` (which is correctly
WhatsApp-specific, used both for that file's live-render merge and
`whatsapp/normalize.ts`'s hard validation) — reusing the narrower
WhatsApp rule for RCS would incorrectly flag valid RCS content (e.g. a
`rich_card` immediately followed by `suggested_replies`, no text needed)
as an error. If you touch either ownership rule, keep this asymmetry;
don't try to unify them.

**This caught real bugs on first run**: wiring this up immediately failed
4 nodes across `ecommerce.yaml` and `singapore-airlines.yaml` —
`rich_card`/`carousel` messages immediately followed by a `suggested_replies`
with no owning text, which is invalid on WhatsApp (fine on RCS, per the
asymmetry above). Fixed by adding a short connecting text message before
each — same pattern as the `help`/`confirmed` fixes in the previous
section. If you add a new node that ends a `rich_card`/`carousel` with a
follow-up `suggested_replies`/`suggested_actions`, add a one-line text
message between them for WhatsApp's sake, or expect load to fail.

## `node.actions` renders inline, not as a floating bar

`ActionBar.tsx` was **deleted**. A node's `actions:` (the lightweight way
to author a button row without writing a full `suggested_replies`
message) renders attached to the message it logically follows, scrolling
with it. This was a real bug fix in two stages:

1. First pass (0.5.1): moved the button row out of a bar pinned above the
   composer and into `ConversationView`, as the last scrolled item —
   correct in that it now scrolled with history, but it still rendered as
   its own DOM sibling below the last message's card, with a visible gap.
   Real WhatsApp/RCS interactive buttons are part of the *same message
   object* that offered them, not a second one.
2. Second pass (0.6.1): closed that gap for WhatsApp specifically. A
   `trailingActions?: { choices, onSelect }` prop was threaded
   `ConversationView` → `MessageRenderer` → `TextMessage` →
   `MessageShell.tsx`, which now renders it as a divided footer *inside*
   the same bubble/card — flush, `border-t`-divided between content and
   buttons and between each button, no independent background/shadow/
   timestamp on the button row. `ConversationView` decides per-render
   whether to attach: only when the channel's chip style is `'stacked'`
   (WhatsApp — one full-width row per button) **and** the last history
   message is `type: 'text'` with `sender: 'business'`. Otherwise it falls
   back to the pre-existing separate `ChoiceChips` pill row.

   **This RCS/WhatsApp split is deliberate, not a shortcut**: real RCS
   suggestion chips genuinely do float as their own pill row below the
   card (confirmed against Google's RCS spec) — unifying the two would
   have made RCS *less* accurate to fix WhatsApp. If you add a new
   `chipStyle`, decide explicitly which behavior it should get; don't
   assume "attach" is universally more correct.

3. Third pass (0.7.0): the exact same "floating with a gap" bug existed for
   standalone `suggested_replies`/`suggested_actions` *messages*, not just
   node-level `actions`. A real WhatsApp interactive message can't be
   buttons with no body text at all — so when one of these messages
   immediately follows a business `text` message in the same node, it now
   merges into that text message's card instead of rendering as its own
   `SuggestedReplies`/`SuggestedActions` component. The merge decision was
   pulled out of the component into a pure, unit-tested function —
   `computeMessageAttachments` in `engine/messageAttachment.ts` — matching
   this file's "engine is pure and testable" rule, rather than growing
   more inline conditionals in `ConversationView.tsx`. `MessageShell`'s
   `trailingActions` prop was generalized from `{ choices, onSelect }`
   (`Choice`-only) to `TrailingActionItem[]` (`{ key, label, icon?,
   onClick }`) so it can represent either a `Choice` (always navigate) or
   an `Action` (may `open_url`/`call`/etc. via the store's existing
   `handleAction`, with the same icon `ActionButton` already used — now
   shared via `utils/actionIcons.ts`).

   This pass also found and fixed two scenario-content bugs it makes
   newly visible: `ecommerce.yaml`'s `help` and `confirmed` nodes each
   opened with a bare `suggested_actions`/`suggested_replies` message and
   nothing else — not just unattached, but genuinely no real WhatsApp/RCS
   equivalent (buttons always need body text on the wire, not just in our
   UI). Both nodes now open with a short text message first. If you add a
   new node whose first message is `suggested_replies`/`suggested_actions`,
   ask whether that's realistic — it usually needs a preceding `text`.

   **Verified, not changed**: `RichCard`/`Carousel` already correctly keep
   their `actions` buttons scoped inside their own card (each carousel
   card owns its buttons) — they don't have this bug and didn't need
   touching.

   **Still deliberately out of scope**: a `WhatsAppNormalizedMessage`/
   `template` schema discriminator or dedicated normalization layer
   (would fork the unified cross-channel schema this architecture
   depends on — see the top of this file), and schema-level rejection of
   hypothetical floating-button top-level types (moot: `messageSchema`'s
   discriminated union already only permits the types listed in
   `schema/messages.ts` — there's nothing to reject). Per-button-type
   handler semantics (`url` opens a link with no reply sent, `call`
   simulates dialing, `reply` sends a reply and navigates) already existed
   before this pass, in the store's `handleAction` — not something this
   pass needed to add.

**Don't reintroduce a pinned/fixed action bar.** If you need to touch
this: the merge/attach decision lives in `engine/messageAttachment.ts`
(pure, testable — extend its tests before changing its rules), the
per-render wiring (building `TrailingActionItem[]` from a `Choice[]` or
`Action[]`, deciding node-level `actions` fallback) lives in
`ConversationView.tsx`, and the footer rendering lives in
`MessageShell.tsx` (`trailingActions`).

## AI-assisted scenario authoring (0.9.0) — the app's one exception to "nothing is sent to a server"

`docs/SCENARIO_AUTHORING_GUIDE.md` is the canonical, hand-written spec for
what a scenario can contain (schema reference, every message type's exact
shape, real WhatsApp/RCS limits, the attachment rule). **Keep it in sync
by hand** if `schema/*.ts` or `channels/*/capabilities.ts` change — there's
no generator, it's maintained the same way this file is. It's imported
into the app verbatim via Vite's `?raw` suffix
(`src/utils/scenarioAuthoringGuide.ts`) — the same pattern
`scenarios/index.ts` already used for the built-in YAML files — so the
in-app system prompt and the "copy this into any AI tool" text can never
drift apart; there is exactly one copy of this spec.

**Why BYO-API-key, client-side, no backend**: this app is explicitly
static-hosted (GitHub Pages) with zero server-side code, and that's not
changing for this feature — a real backend proxy would be a materially
different, bigger project (hosting, cost, abuse-prevention). Anthropic's
API supports direct browser calls via the
`anthropic-dangerous-direct-browser-access` header specifically for
tools like this one. `src/utils/aiScenarioGenerator.ts` calls it with a
key the user pastes in and `store/persistence.ts` stores client-side
(`loadAiApiKey`/`saveAiApiKey`/`clearAiApiKey`, same pattern as
`loadPreferences`) — sent only to Anthropic, never to any server of
ours. This is confirmed with the user (see the AskUserQuestion exchange
in session history) as an accepted trade-off, not a silent assumption:
a visitor without their own key can't use in-app generation, but always
has the "Copy prompt instead" path in the same modal.

**Bounded self-correction, not an agent loop**: `generateScenarioWithAI`
runs the model's output through the app's own
`validateFlowWithChannelCompliance` (the same validator scenario loading
uses) and, if invalid, retries **exactly once** with the validation
errors fed back, then returns whatever it gets regardless of whether
that's now valid. Don't make this loop open-ended — the editor's existing
live validation preview (`CustomScenarioEditorModal.tsx`) already shows
remaining errors on whatever lands in the draft, so an imperfect result
is still visible and fixable, not a dead end that needs infinite retries
to be useful. `fetch` is an injectable parameter specifically so
`aiScenarioGenerator.test.ts` can test the retry/give-up logic without
ever hitting the real network (no test in this repo hits a real network
— keep it that way).

## Live brand editing (0.10.0) — `configuredBrand`, mirrors `configuredVariables`

The sidebar's **Brand** section (`components/controls/BrandEditor.tsx`) lets
a user override name/shortName/avatar/description/verified per session,
without touching the scenario's YAML. This is a separate store field,
`configuredBrand: BrandDefinition`, seeded from `flow.brand` on load
(`loadFlow`'s new `brandOverride` param) and persisted per-scenario in
`localStorage` (`StoredScenario.configuredBrand`) — same shape as the
pre-existing `configuredVariables`/`updateConfiguredVariable`/
`resetConfiguredVariables` pattern, follow that one if extending this.

**One deliberate difference from Variables**: brand edits apply
*immediately*, not "on next Restart". Variables are baked into message
text at plan-computation time (`computeNodePlan`), so an edit can't
retroactively change already-rendered history without a replay — hence
Variables' "Hit Restart to apply" caveat. The brand block only drives the
header chrome (`PhoneScreen.tsx` passes `configuredBrand`, not
`flow.brand`, into the channel renderer), which re-renders live from
store state on every change like any other prop — there's nothing to
replay. Don't add a "Hit Restart" caveat to `BrandEditor.tsx`; it would be
inaccurate.

`brand.description` is a new schema field (the header subtitle, e.g.
"Business Account" on WhatsApp / "Business messaging" on RCS) — both
header components fall back to their historical hardcoded string via
`brand.description || '<default>'` when it's unset, so this is fully
backward-compatible with every existing scenario.

Picture upload reads a local file into a `data:` URL
(`BrandEditor.tsx`'s `readFileAsDataUrl`) rather than uploading anywhere —
consistent with this app having no backend. `assetUrl.ts` already passes
non-`/`-prefixed strings through unchanged, so a `data:` URL just works as
`brand.avatar` with no special-casing needed.

## Free text + keyword triggers (0.11.0)

The composer (`components/phone/Composer.tsx`) used to be disabled except
when a node's `type: input` message was actively awaiting entry
(placeholder: "Tap a suggestion above"). It's now always typable — real
WhatsApp/RCS composers never lock like that, and this is what "simulated
free texting" means. Every submit goes through one new store action,
`handleFreeText`, instead of calling `handleInputSubmit` directly:

1. Check `flow.triggers` (new, global, top-level — `engine/triggerMatcher.ts`'s
   `matchTrigger`) first. **This wins even over an active `input` field** —
   deliberate, so a keyword like "cancel"/"help" works as an anytime escape
   hatch that can interrupt structured input capture, matching how real
   bots commonly implement keyword commands. If you're tempted to make
   active-input capture take priority instead, don't — that would make
   "type CANCEL anytime" unreliable exactly when it matters most (mid-form).
2. If no trigger matches, fall back to the pre-existing active-`input`
   capture (`handleInputSubmit`) unchanged.
3. If neither applies, `resolveFreeText` (in `ConversationEngine.ts`,
   alongside the other `resolve*` functions) still records the typed text
   as an outgoing user bubble via `applyInteractionResult`, just with no
   `nextNodeId` — `applyInteractionResult` already handles an undefined
   `nextNodeId` safely (message is added, no navigation), so this is not a
   special case requiring new plumbing. **Don't add a "sorry, I didn't
   understand" auto-reply for the no-match case** — a real bot silently not
   responding to unrecognized input is the realistic behavior being
   simulated, not a gap to paper over.

Matching (`matchTrigger`) is whole-word (`\b`-bounded regex per keyword,
case-insensitive unless `caseSensitive: true`), not raw substring — "cat"
must not fire on "category". This is a pure, timer-free function like
`conditionEvaluator.ts`, not folded into `ConversationEngine.ts` itself,
following that file's existing separation of "matching algorithm" from
"resolve into an InteractionResult".

`flowValidator.ts` checks `trigger.next` for dangling references, same as
every other `next`-like field — triggers are global (no owning node), so
that one check doesn't go through the node-scoped `checkRef` helper.

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

- Built-in scenarios: `src/scenarios/{singapore-airlines,ecommerce,restaurant,beerlao}.yaml`,
  registered in `src/scenarios/index.ts`.
- Schema: `src/schema/messages.ts` (message types), `src/schema/flow.ts`
  (node/flow structure).
- Channel capabilities: `src/channels/{rcs,whatsapp}/capabilities.ts`,
  shared logic in `src/channels/capabilities.ts`. Hard, real-payload-shape
  validation: `src/channels/{rcs,whatsapp}/normalize.ts`.
- Engine core: `src/engine/ConversationEngine.ts` (computeNodePlan — the
  pure "what happens when this node is entered" function).
- Store: `src/store/simulatorStore.ts` (single Zustand store, large file,
  organized by feature area with comments).
- Tests: colocated `*.test.ts` next to the thing they test; run all with
  `npm test`.
