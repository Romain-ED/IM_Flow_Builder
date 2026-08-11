# Business Messaging Flow Simulator

An interactive, browser-only prototyping tool for conversational business messaging journeys — RCS Business Messaging, WhatsApp Business, and a channel-neutral "generic" mode. Load a flow written in JSON or YAML and immediately walk through it as if you were the customer, inside a realistic phone-shaped chat UI.

It is **not connected to any real messaging API**. It's built for demos, customer workshops, sales engineering, solution-architecture walkthroughs, and conversational UX design — a place to iterate on a flow definition and see it rendered and interacted with instantly, in whichever channel's visual language you pick.

## What it does

- Loads a **declarative flow definition** (JSON or YAML) describing a state-machine of conversation "nodes".
- Runs that flow through a channel-agnostic **conversation engine** (deterministic, no `eval`, fully unit-testable).
- Renders the live conversation through a **channel renderer** (RCS / WhatsApp / Generic) inside a polished phone mockup.
- Lets a presenter tweak variables (customer name, booking reference, seat, …), restart, step back, jump to any node, switch channels live, and demo cleanly in **Presenter Mode**.
- Ships with three complete example scenarios — an airline check-in/boarding-pass journey (the default), an e-commerce delivery tracker, and a restaurant reservation flow.
- Has three pages, reachable from the top nav: **Simulator** (the demo tool itself), **Scenarios** (load/duplicate/edit/import/export/delete flow definitions — custom ones are saved to `localStorage`), and **Manual** (an in-app guide covering usage, every parameter, the technical architecture, and a changelog).
- Installable and fully offline-capable (PWA) after the first load, and supports **shareable scenario links** (a flow encoded straight into a URL) and a **side-by-side channel comparison** view.

## Installation & development

```bash
npm install
npm run dev       # starts the Vite dev server
```

```bash
npm run build      # type-checks (tsc -b) and produces a production build in dist/
npm run preview    # serve the production build locally
npm test           # run the Vitest unit test suite once
npm run test:watch # run tests in watch mode
```

Everything runs entirely in the browser — there is no backend. User preferences (channel, fast mode, presenter mode, debug-warning visibility) and the last-loaded scenario (including any edited variables) are persisted to `localStorage`, so a reload picks up where you left off.

## Deployment (GitHub Pages)

Every push to `main` builds and deploys the app to GitHub Pages via `.github/workflows/deploy-pages.yml`, publishing it at:

```
https://romain-ed.github.io/Vonage_test/
```

One-time setup (repo admin only, done once): in **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. After that, deploys are fully automatic — no manual step is needed per release.

Because GitHub Pages serves this as a project site under a sub-path rather than a domain root, production builds set Vite's `base` to `/Vonage_test/` (see `vite.config.ts`); the dev server keeps `base: '/'` so local development is unaffected. Scenario-authored asset paths (`"/assets/logo.svg"` etc.) are resolved against that base at runtime by `src/utils/assetUrl.ts`, used by the two components that ever render an `<img>` (`Avatar`, `ImageWithFallback`) — so custom scenarios you author or import keep working under either a root or a sub-path deployment without any changes.

## Architecture

```
JSON / YAML flow definition
          │
          ▼
   Zod schema validation      (schema/flow.ts, schema/messages.ts)
          │
          ▼
   Conversation engine        (engine/*)  — pure, timer-free, unit-tested
          │
          ▼
   Channel renderer   ──┬── RCS       (channels/rcs)
                        ├── WhatsApp  (channels/whatsapp)
                        └── Generic   (channels/generic)
          │
          ▼
   Interactive phone simulator (components/phone/*)
```

The engine never imports React, and no message component hardcodes a specific demo's content — every scenario is just data. Adding a new scenario means adding a YAML file; adding a new message type means adding a schema variant, a renderer component, and a `case` in `MessageRenderer.tsx` — nothing else needs to change.

```
src/
  app/                    pages.ts (page routing type), version.ts, changelog.ts,
                           ChannelContext.tsx (per-phone-screen channel override,
                           used by Compare Mode)
  components/
    layout/               AppHeader (nav + version badge), Sidebar,
                           PresenterFloatingControls
    phone/                PhoneFrame, PhoneScreen, ComparePhones, ConversationView,
                           Composer, ActionBar, MessageShell, ChoiceChips,
                           ActionButton, ListSheet, Toast, ExternalActionModal, …
    controls/              ScenarioControls, ChannelSelector (+ Compare toggle),
                           VariablesEditor, DebugOptions, PlaybackControls
    editor/                ScenarioEditorModal (paste/import/validate/export),
                           ToolbarButton
    debug/                 DebugDrawer (flow inspector), FlowGraphView (visual
                           node graph, List/Graph toggle)
    scenarios/             ScenariosPage, ScenarioCard, CustomScenarioEditorModal
                           (has its own Source/Graph tabs)
    manual/                ManualPage (usage guide + parameter reference +
                           architecture + changelog)
    common/                ImageWithFallback, CodePlaceholder (QR/barcode),
                           SectionHeading

  channels/
    capabilities.ts        shared ChannelCapabilities type + helpers
    theme.ts                per-channel visual tokens (bubble colors, chip style…)
    registry.ts             channel → capabilities / renderer lookup tables
    rcs/       RcsRenderer.tsx, RcsHeader.tsx, capabilities.ts
    whatsapp/  WhatsAppRenderer.tsx, WhatsAppHeader.tsx, capabilities.ts
    generic/   GenericRenderer.tsx, GenericHeader.tsx, capabilities.ts

  messages/                 One component per message type, all rendered
                             through MessageRenderer.tsx's dispatcher

  engine/
    ConversationEngine.ts   computeNodePlan (pure), resolveChoice/resolveAction/…
    templateRenderer.ts     safe {{variable}} substitution (regex only, no eval)
    conditionEvaluator.ts   equals / not_equals / exists / contains / >/< 
    flowValidator.ts        Zod parse + duplicate-id / dangling-reference checks
    flowGraph.ts             pure BFS layout engine for the visual graph view
    eventStore.ts           ConversationEvent union + variable-diff helper
    types.ts                NormalizedMessage, PlayStep, NodeOutcome, …

  schema/
    messages.ts             discriminated-union Message/Action/Choice schemas
    flow.ts                 FlowDefinition / FlowNode / Condition schemas

  store/
    simulatorStore.ts        Zustand store: playback, variables, channel,
                             compare mode, custom scenarios, presenter mode,
                             snapshots for Back, persistence
    persistence.ts           localStorage read/write helpers (prefs, last
                             scenario, custom scenarios)

  scenarios/                 singapore-airlines.yaml (default), ecommerce.yaml,
                             restaurant.yaml, index.ts (registry)

  utils/                     flowSource (JSON/YAML parse+serialize),
                             shareLink (gzip + base64url URL encoding),
                             boardingPassFile (canvas → PNG download),
                             exampleFlowTemplate, accents, selectors, id, sleep, time

public/                       Bundled offline SVG placeholder illustrations +
                             PWA icons (pwa-icon-192.png, pwa-icon-512.png)
```

### Why a "plan/execute" split in the engine?

`computeNodePlan(flow, nodeId, variables)` is a **pure function**: given a node and the current variables, it deterministically returns the ordered list of steps to play (typing indicator → wait → message → …) and the resulting control-flow outcome (`await-actions`, `auto-transition`, `condition`, `idle`, `terminal`, or `error`). It contains no `setTimeout` and no side effects, so it's simple to unit test exhaustively (see `src/engine/ConversationEngine.test.ts`).

The Zustand store (`simulatorStore.ts`) is the only place that turns that plan into real wall-clock playback — honoring **Fast demo mode**, **Pause/Resume**, and cancellation (e.g. when the presenter hits Restart or Back mid-animation).

### Why do inline buttons "disable" themselves after use?

Every interactive element in history (a suggested-reply chip, a carousel button, a boarding-pass action, a list) is gated by one rule: `message.nodeId === currentNodeId`. Once the flow transitions to a new node, `currentNodeId` changes and every older message's buttons render dimmed and inert automatically — no separate "disabled" bookkeeping needed anywhere.

## Flow definition format

```yaml
version: "1.0"
metadata:
  id: my-scenario
  name: "My scenario"
  channel: rcs            # rcs | whatsapp | generic — used as the initial channel
  tags: [demo]
brand:
  name: "Acme Airlines"
  avatar: "/assets/brand-avatar.svg"
  verified: true
defaults:
  messageDelayMs: 500      # pause before each message appears
  typingDurationMs: 900    # typing indicator duration before a business message
  showTimestamps: true
variables:
  customerName: Alex        # available for {{customerName}} templating everywhere
start: welcome
nodes:
  - id: welcome
    messages:
      - type: text
        text: "Hi {{customerName}}!"
    actions:                # persistent suggested-reply / button bar
      - label: "Get started"
        next: next_node
```

A **node** can: play one or more messages in sequence (with per-message `delayMs`/`typingMs` overrides and a `delay` pseudo-message for extra pauses), set variables unconditionally (`set:`), branch on a `condition` (`then`/`else`), auto-continue to another node (`next`), present a persistent `actions` bar, or simply end (`end: true`).

**Interactions** reference other nodes with `next`. When one fires, the engine (in order): renders the user's selection as an outgoing bubble (when applicable), applies any `set` variables, and transitions — replaying typing/delay steps and rendering the target node's messages.

### Templating

`{{variableName}}` is replaced with the current value of that variable anywhere inside a message (recursively, including nested fields like `origin.code`). It is pure regex substitution — there is no expression language and nothing is ever `eval`'d. Unknown/`null` variables render as an empty string.

### Conditional branching

```yaml
- id: check_in_router
  condition:
    variable: checkedIn
    operator: equals   # equals | not_equals | exists | contains | greater_than | less_than
    value: true
  then: already_checked_in
  else: check_in_intro
```

## Supported message components

| type | notes |
|---|---|
| `text` | multiline, basic URL auto-linking, `**bold**` / `_italic_` |
| `image` | graceful broken-image fallback |
| `video` | preview card with play affordance (no real playback) |
| `document` | tap to simulate a download + toast |
| `rich_card` | image + title/description + action buttons |
| `carousel` | horizontally scrollable cards, each with its own buttons |
| `suggested_replies` | inline reply chips |
| `suggested_actions` | `open_url` / `call` / `location` / `calendar` / `custom` (each shows a simulated modal) |
| `list` | opens a bottom-sheet menu of sections/rows |
| `input` | `text`/`email`/`phone`/`numeric`/`date`; drives the composer, stores the value in a variable |
| `flight_card` | airline route summary card |
| `boarding_pass` | polished boarding pass with Download / Add to wallet / View buttons built in for free |
| `location` | map-preview card with an "Open in Maps" simulated action |
| `otp` | segmented verification-code entry with its own Verify button |
| `payment_request` | "Pay now" card that simulates a charge and can transition on completion |
| `calendar_event` | rich calendar-invite card with "Add to calendar" |
| `product_catalog` | horizontally scrollable products, each with "Add to cart" (simulated) |
| `whatsapp_flow` | placeholder card for an embedded WhatsApp Flow, with a configurable CTA |
| `system_action` | compact, centered simulator notice (e.g. "Boarding pass downloaded") — not a business/user chat bubble |
| `delay` | pseudo-message: pause without rendering anything |
| `typing` | pseudo-message: shows the typing indicator for `duration` ms, then disappears — never stored in history |

Messages can be authored with `"sender": "user"` for scripted autoplay lines, in addition to the normal `"sender": "business"` (the default).

## Adding a scenario

1. Add a new `.yaml` (or `.json`) file under `src/scenarios/`.
2. Register it in `src/scenarios/index.ts`'s `BUILT_IN_SCENARIOS` array.

No React code needs to change — the sidebar's "Load example" dropdown and the engine pick it up automatically. You can also just paste/import a flow via the in-app **Edit flow** panel without touching the repo at all.

## Adding a message type

1. Add a Zod variant to the `messageSchema` discriminated union in `src/schema/messages.ts`.
2. Create a renderer component in `src/messages/`.
3. Add a `case` for it in `src/messages/MessageRenderer.tsx`.
4. Add it to each channel's `supportedMessageTypes` in `src/channels/*/capabilities.ts` (or leave it out — unsupported types still render, with an optional debug fallback note).

The conversation engine needs no changes — `computeNodePlan` interpolates and sequences any message type generically.

## Adding another channel

1. Add the channel id to `channelIdSchema` in `src/schema/flow.ts`.
2. Create `src/channels/<id>/capabilities.ts`, `<Id>Header.tsx`, and `<Id>Renderer.tsx`.
3. Register both in `src/channels/registry.ts` and add it to `CHANNEL_OPTIONS`.
4. Optionally add channel-specific tokens to `src/channels/theme.ts` (bubble colors, chip style, etc).

## Channel capability warnings

Each channel declares which message types it natively supports in `capabilities.ts` (kept out of React entirely). When a scenario uses a type a channel doesn't support, the simulator still renders a reasonable generic approximation and — outside Presenter Mode, when "Show capability warnings" is on — shows a small inline note explaining the fallback.

## Known limitations

- This is a front-end prototype: there is no real messaging delivery, no backend, and no persistence beyond `localStorage`.
- Video/document/"add to wallet" actions are simulated (toast/preview) rather than functional; only the boarding pass "Download" produces a real file (a client-side generated PNG — no external PDF library was added to keep dependencies minimal).
- The QR/barcode on the boarding pass are decorative placeholders seeded from the booking reference; they encode no real data.
- Undo ("Back") restores full state snapshots taken before each user-driven interaction; it does not rewind mid-animation to an arbitrary point in time.
- Carousel/list/action ordering assumes each node's interactive content is meant to stay live only until the node changes — this app does not support multiple *concurrent* independent conversation threads.
- The flow graph view is read-only navigation/visualization, not a drag-and-drop editor — node positions are auto-computed, not stored, and there's no inline field editing on the graph yet.
- Shareable links encode the whole flow source in the URL (gzip-compressed); very large custom flows will produce a long URL. The offline PWA cache is precache-all, so it's a good fit for this app's fully-bundled build but wouldn't scale as-is to an app with large runtime-fetched datasets.

## Possible next improvements

- Inline field editing directly on the flow graph (turning the viewer into a true visual editor).
- Optional multi-scenario "playlists" for longer sales demos.
- Unattended "record & replay" mode for booth demos.
- Payment/OTP/location message types with pluggable, scenario-defined validation rules.
