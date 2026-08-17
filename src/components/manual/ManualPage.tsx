import type { ReactNode } from 'react'
import { ArrowDown, Sparkles } from 'lucide-react'
import { APP_VERSION } from '../../app/version'
import { CHANGELOG } from '../../app/changelog'

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'interface', label: 'Interface guide' },
  { id: 'flow-format', label: 'Flow definition reference' },
  { id: 'ai-authoring', label: 'Generating scenarios with AI' },
  { id: 'architecture', label: 'Technical architecture' },
  { id: 'changelog', label: 'Changelog' },
  { id: 'limitations', label: 'Limitations & roadmap' },
]

export function ManualPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-semibold text-slate-900 m-0">Business Messaging Flow Simulator</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">
              <Sparkles size={11} /> Beta
            </span>
          </div>
          <p className="text-[13px] text-slate-500 m-0">
            Created by <span className="font-medium text-slate-700">Romain</span> · version {APP_VERSION} · this
            manual covers what the tool does, every control and flow-definition parameter, and how it's built.
          </p>
          <p className="text-[12.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1 max-w-xl">
            This is a beta release. Behavior, layout, and the flow schema may still change — please report anything
            that looks broken or confusing.
          </p>
        </header>

        <nav aria-label="Manual sections" className="flex flex-wrap gap-2">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-[12px] font-medium rounded-full px-3 py-1 bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Section id="overview" title="Overview" accent="indigo">
          <P>
            This is an interactive, browser-only prototyping tool for conversational business messaging journeys on
            RCS Business Messaging and WhatsApp Business. You load a flow written in JSON or YAML and immediately
            walk through it as if you were the customer, inside a realistic phone-shaped chat UI.
          </P>
          <P>
            It is <strong>not connected to any real messaging API</strong>. It exists for demos, customer workshops,
            sales engineering, solution-architecture walkthroughs, and conversational UX design — a place to iterate
            on a flow definition and see it rendered and interacted with instantly, in whichever channel's visual
            language you pick.
          </P>
          <P>
            Everything — the flow you're editing, your channel/variable preferences, and any custom scenarios you
            save — lives in this browser's local storage. Nothing is sent to a server, with one opt-in exception:
            clicking "Generate with AI" in the scenario editor sends your description and an Anthropic API key you
            provide directly to Anthropic's API from this browser — never through any server of ours. See "Generating
            scenarios with AI" below.
          </P>
        </Section>

        <Section id="interface" title="Interface guide" accent="violet">
          <P>The main Simulator screen has three regions: a control sidebar, the phone preview, and an optional flow inspector.</P>
          <ParamTable
            rows={[
              ['Scenario', 'Shows the loaded flow\'s name, a dropdown of built-in examples, "Edit flow" (opens the quick JSON/YAML editor for the live flow), "Export" (downloads the current flow as YAML), and "Copy share link" (encodes the flow into a URL — opening it loads the same scenario in a restricted viewer, no file needed; see "Presenter mode" below).'],
              ['Channel', 'Switches the rendering between RCS and WhatsApp. The same flow definition renders through each channel\'s own visual language and capability set. "Compare all channels" shows both at once, driven by the same live conversation — tap a button in either and the other follows.'],
              ['Brand', 'Edit the business profile shown in the header: name, short name, picture (upload a file or paste a URL), description subtitle, and the verified checkmark. Applies immediately, no restart needed — useful for re-skinning a demo without touching the scenario file. "Reset" reverts to the loaded flow\'s own brand block.'],
              ['Variables', 'Editable list of the flow\'s top-level variables (e.g. customer name, booking reference, seat). Edits apply on the next Restart, not live — this lets a presenter line up several fields before restarting the demo.'],
              ['Debug options', '"Fast demo mode" shrinks all typing/message delays; "Show capability warnings" toggles the inline notes shown when a message type falls back to a generic rendering on a channel that doesn\'t natively support it; "Flow inspector panel" toggles the right-hand debug drawer; "Start node" overrides which node Restart jumps to.'],
              ['Playback', 'Restart (replays from the start node using the current variable values), Back (undoes the last user interaction using a state snapshot), Pause/Resume (freezes automatic playback), Clear (same as Restart).'],
              ['Phone preview', 'The focal point — a realistic mobile chat UI rendering the live conversation for the selected channel.'],
              ['Flow inspector', 'Shows the current node id, live variable values, the node-visit history (click any entry to jump straight to that node), validation errors if any, and a recent event log. The "Flow graph" section has a List/Graph toggle — Graph lays out every node and connection automatically and lets you click any box to jump straight to it live. The same graph view (read-only there) is also available while editing a scenario, or via "View" on any scenario card on the Scenarios page.'],
              ['Presenter mode', 'Hides all configuration chrome and enlarges the phone for screen-sharing with customers; a small floating control keeps Restart and fullscreen within reach. Toggled on/off from the header — a preference, not a lock.'],
              ['Shared links', 'Opening a "Copy share link" URL goes further than Presenter mode: there\'s no header, no Sidebar, no Scenarios/Manual pages, and no Flow Inspector at all — just the phone and a Restart button, permanently for that page load. A link recipient only ever sees the one scenario the link author shared, with no path to anything else in the tool, including whatever scenario is saved in their own browser.'],
            ]}
          />
        </Section>

        <Section id="flow-format" title="Flow definition reference" accent="emerald">
          <P>A flow is a YAML or JSON document with this top-level shape:</P>
          <CodeBlock>{`version: "1.0"
metadata: { id, name, description?, channel?, tags? }
brand: { name, shortName?, avatar?, logo?, verified?, description?, website?, supportPhone? }
defaults: { messageDelayMs?, typingDurationMs?, locale?, timezone?, showTimestamps? }
variables: { ...any key/value pairs used by {{templating}} }
triggers: [ ...{ keywords, next, set? } ]  // optional global keyword routes
start: "<id of the first node>"
nodes: [ ...FlowNode ]`}</CodeBlock>

          <h3 className="text-[13.5px] font-semibold text-slate-800 mt-4 mb-1">Free text &amp; keyword triggers</h3>
          <P>
            The composer is always typable, not only while an <code>input</code> message is active — anything the
            user types sends as an outgoing bubble, whether or not it matches anything. <code>triggers</code> are
            global keyword routes, independent of the current node: each entry matches when any of its{' '}
            <code>keywords</code> appears as a whole word in the typed text (case-insensitive by default —{' '}
            <code>caseSensitive: true</code> to change that; "cat" won't match "category"), and transitions to{' '}
            <code>next</code> — the first matching trigger wins. A trigger match takes priority even over an
            active <code>input</code> field, so a keyword like "cancel" or "help" can interrupt whatever the user
            was doing. If nothing matches and no <code>input</code> is active, the message still sends — it just
            gets no automatic response, the same as a real bot that doesn't recognize the input.
          </P>

          <h3 className="text-[13.5px] font-semibold text-slate-800 mt-2 mb-1">Node fields</h3>
          <ParamTable
            rows={[
              ['id', 'Unique identifier other nodes/actions reference via "next".'],
              ['messages', 'Ordered list of messages/pseudo-messages to play when the node is entered.'],
              ['actions', 'Buttons shown once messages finish playing, attached to the last message — a lighter way to author what a suggested_replies message does; renders identically.'],
              ['set', 'Variables to assign unconditionally as soon as the node is entered.'],
              ['condition / then / else', 'Declarative branch: variable + operator (equals, not_equals, exists, contains, greater_than, less_than) + value, routing to "then" or "else".'],
              ['next', 'Automatic transition to another node once messages finish, when there is no condition or actions.'],
              ['end', 'Marks a deliberate end of the scenario.'],
            ]}
          />

          <h3 className="text-[13.5px] font-semibold text-slate-800 mt-4 mb-1">Message types</h3>
          <ParamTable
            rows={[
              ['text', 'Multiline text, basic URL auto-linking, **bold**/_italic_. Official on every channel.'],
              ['image / video / document', 'Media with graceful broken-asset fallback; document taps simulate a download. Official on every channel.'],
              ['rich_card', 'An optional header (text OR image, not both) + title + description + optional footer + up to a few buttons. Official: matches a real WhatsApp interactive message (header/body/footer/buttons) and a real RCS rich card — RCS has no separate header/footer fields, so those two only render on the WhatsApp channel.'],
              ['carousel', 'A horizontally scrollable row of cards, each with its own buttons. Official: matches WhatsApp\'s Carousel Template (Meta-approved, up to 10 cards / 2 buttons each) and a real RCS carousel (2–10 cards / 4 buttons each).'],
              ['suggested_replies', 'Inline reply chips. Official — matches WhatsApp interactive reply buttons (max 3) and RCS suggestion chips (max 11).'],
              ['suggested_actions', 'Richer buttons (open_url, call, location, calendar, custom). The reply/open_url subtypes are official; the others are simulator conveniences shown as a modal/toast rather than a real WhatsApp button type.'],
              ['list', 'Opens a bottom-sheet menu of grouped rows, with an optional text-only header/footer. Official on WhatsApp (native list picker). RCS has no equivalent — see below.'],
              ['input', 'Free-text/email/phone/numeric/date entry that drives the composer and stores the value in a variable. Simulator convenience: real WhatsApp/RCS composers are always plain text; there\'s no structured input-type UI.'],
              ['location', 'A map-preview card with a label/address and an "Open in Maps" simulated action. Official on both — matches WhatsApp\'s location message and RCS\'s location suggested action.'],
              ['product_catalog', 'A horizontally scrollable row of products. Official on WhatsApp (multi-product/catalog message); RCS has no equivalent, shown as a generic fallback.'],
              ['whatsapp_flow', 'A placeholder card representing an embedded WhatsApp Flow. Official — WhatsApp Flows are a real interactive subtype; WhatsApp-only by definition.'],
              ['system_action', 'A compact, centered simulator notice (e.g. "Boarding pass downloaded") — not a business or user chat bubble, so it isn\'t a "message type" claim at all; it represents a local device/app action.'],
              ['typing', 'Pseudo-message: shows the typing indicator for duration ms, then disappears — never stored in history. Not a message.'],
              ['delay', 'Pseudo-message: pause without rendering anything. Not a message.'],
            ]}
          />
          <P>
            <strong>No official equivalent on any platform</strong> — <code>flight_card</code>, <code>boarding_pass</code>,{' '}
            <code>otp</code>, <code>payment_request</code>, and <code>calendar_event</code> are still defined in the
            schema (so a custom scenario can still use them, and they render with an honest fallback note), but none
            of the built-in demo scenarios use them anymore. A real integration would express the same moments with
            official primitives instead — e.g. a boarding pass is a <code>document</code> (PDF) + <code>text</code> summary
            + <code>suggested_replies</code>; a one-time code is plain <code>text</code> (WhatsApp's real Authentication
            Template sends fixed text with a "Copy code" button — the code is never typed back into the chat); a
            payment prompt is a <code>rich_card</code> with an <code>open_url</code> button. See the Changelog for the
            full before/after.
          </P>
          <P>
            Templating uses <code>{'{{variableName}}'}</code> — plain regex substitution against the current
            variables, recursively applied to every string field in a message. There is no expression language and
            nothing is ever evaluated as code.
          </P>
          <P>
            <code>**bold**</code> and <code>_italic_</code> (plus auto-linked <code>https://</code> URLs) render in
            any prose field — <code>text</code> messages, <code>rich_card</code>/<code>list</code>{' '}
            <code>description</code>/<code>footer</code>, carousel card <code>subtitle</code>/
            <code>description</code>, and image/video <code>caption</code>. Short-label fields (
            <code>title</code>/<code>header</code>, button/chip labels, document title/description) stay plain, same
            as those fields render on the real platforms.
          </P>

          <h3 className="text-[13.5px] font-semibold text-slate-800 mt-4 mb-1">Real platform limits</h3>
          <P>
            Beyond which types render natively, each channel's structural limits are modeled against the real
            platform spec — Meta's WhatsApp Cloud API docs and Google's RCS Business Messaging API — and checked live
            against authored content (same inline-note mechanism as the fallback warnings above).
          </P>
          <PlatformLimitsTable />
          <P>
            RCS's real content model is text, an uploaded file, or a rich card (standalone or in a carousel) — there
            is no native list/menu picker the way WhatsApp has one, so <code>list</code> intentionally falls back to
            a stacked-option rich card on RCS rather than being treated as natively supported.
          </P>
          <P>
            Beyond that live check, count/structural violations — buttons with no owning body text, too many
            buttons/rows/cards, an RCS carousel under 2 cards — now hard-fail loading the scenario entirely, the same
            way a broken node reference does, since that content genuinely couldn't be sent to a real WhatsApp/RCS
            number. Label/title length limits stay a live warning rather than a hard error, since a variable can
            change a length per run.
          </P>
        </Section>

        <Section id="ai-authoring" title="Generating scenarios with AI" accent="violet">
          <P>
            "Generate with AI" in the scenario editor (New/Edit scenario → toolbar) offers two paths, both built from
            the same spec document (<code>docs/SCENARIO_AUTHORING_GUIDE.md</code> in the repo) so they can't drift
            apart:
          </P>
          <ParamTable
            rows={[
              [
                'Generate',
                'Describe the conversation you want and paste in your own Anthropic API key. The app calls Anthropic\'s API directly from your browser — there is no backend, so this is the only way an in-app assistant can work without sending your key through a server of ours. The key is stored only in this browser\'s local storage and sent only to Anthropic. If the first result fails the app\'s own validator, it automatically retries once with the validation errors fed back for a self-correction pass, then hands back whatever it gets — reviewed and editable in the Source view either way.',
              ],
              [
                'Copy prompt instead',
                'No API key needed. Copies the full spec plus your description to the clipboard — paste it into Claude, ChatGPT, or any AI tool you already use, then paste the resulting YAML back into the editor.',
              ],
            ]}
          />
          <P>
            The spec document is also useful on its own: browse it directly in the repo, or copy it manually, for a
            complete reference of every message type, field, and the real WhatsApp/RCS structural limits — the same
            source of truth this Manual's message-type table and platform-limits table above are written from.
          </P>
        </Section>

        <Section id="architecture" title="Technical architecture" accent="teal">
          <P>The engine, storage, and rendering are strictly layered so scenarios stay pure data:</P>
          <ArchitectureDiagram />
          <ParamTable
            rows={[
              ['schema/', 'Zod discriminated-union schemas for messages, actions, nodes and the top-level flow — the single source of truth for both validation and TypeScript types.'],
              ['engine/', 'Pure, timer-free functions: computeNodePlan (what to play + what happens next), templateRenderer, conditionEvaluator, flowValidator, plus the ConversationEvent log types.'],
              ['store/', 'The Zustand store is the only place that turns an engine plan into real wall-clock playback — handling Fast mode, Pause/Resume, Back/Restart via state snapshots, and localStorage persistence.'],
              ['channels/', 'Per-channel capabilities (which message types are natively supported) and renderers (header + chrome). Content components stay shared; only chrome and capability rules differ per channel.'],
              ['messages/', 'One React component per message type, dispatched generically by MessageRenderer — no scenario-specific logic lives here.'],
              ['components/', 'The phone simulator chrome, sidebar controls, flow inspector, and the Scenarios/Manual pages all live here, organized by feature.'],
            ]}
          />
        </Section>

        <Section id="changelog" title="Changelog" accent="amber">
          <P>
            Version numbers follow a lightweight scheme while the app is in beta (0.x): a bump in the middle number
            means new features shipped, a bump in the last number means fixes only.
          </P>
          <div className="flex flex-col gap-4">
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200">
                  <span className="text-[12.5px] font-semibold text-slate-800">v{entry.version}</span>
                  <span className="text-[11.5px] text-slate-400">{entry.date}</span>
                </div>
                <ul className="m-0 px-7 py-2.5 flex flex-col gap-1.5 list-disc">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-[12.5px] text-slate-600 leading-relaxed">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="limitations" title="Limitations & roadmap" accent="rose">
          <P>
            No backend, no real message delivery. Video/wallet/payment actions are simulated; only the boarding-pass
            "Download" produces a real file (a client-side generated PNG). The boarding pass QR/barcode and the
            location map preview are seeded decorative placeholders with no real data encoded. "Back" restores
            discrete snapshots taken before each interaction rather than rewinding an arbitrary point mid-animation.
            The flow graph viewer is read-only — it's built for navigating and understanding a flow, not yet for
            dragging nodes around or editing fields inline (that's still done in the JSON/YAML editor).
          </P>
          <P>
            Planned next: inline field editing directly on the graph, multi-scenario demo playlists, and an
            "unattended record & replay" mode for booth demos.
          </P>
        </Section>
      </div>
    </div>
  )
}

const SECTION_ACCENTS = {
  indigo: 'text-indigo-600',
  violet: 'text-violet-600',
  emerald: 'text-emerald-600',
  teal: 'text-teal-600',
  rose: 'text-rose-600',
  amber: 'text-amber-600',
} as const

function Section({
  id,
  title,
  accent,
  children,
}: {
  id: string
  title: string
  accent: keyof typeof SECTION_ACCENTS
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className={`text-[15px] font-semibold m-0 mb-3 ${SECTION_ACCENTS[accent]}`}>{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-slate-600 m-0">{children}</p>
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 rounded-lg p-3.5 text-[11.5px] leading-relaxed overflow-x-auto thin-scrollbar m-0">
      <code>{children}</code>
    </pre>
  )
}

function ParamTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {rows.map(([term, desc], i) => (
        <div
          key={term}
          className={`flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''} ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
        >
          <code className="text-[12px] font-semibold text-slate-800 shrink-0 sm:w-40 break-words">{term}</code>
          <span className="text-[12.5px] text-slate-600 leading-relaxed">{desc}</span>
        </div>
      ))}
    </div>
  )
}

const PLATFORM_LIMITS: [string, string, string][] = [
  ['Suggested-reply / interactive buttons per message', '3', '11 chips (4 per rich card)'],
  ['Carousel cards', 'up to 10 (Carousel Template, Meta-approved)', '2–10'],
  ['Buttons per carousel card', '2', '4'],
  ['Button/chip label length', '20 chars', '25 chars'],
  ['List rows (total, all sections)', '10', '— (no native list picker)'],
  ['List row title length', '24 chars', '—'],
  ['Rich card title / description length', 'not separately capped', '200 / 2000 chars'],
  ['Header / footer text length (rich_card, list)', '60 / 60 chars', 'no dedicated fields — not rendered'],
]

function PlatformLimitsTable() {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden overflow-x-auto thin-scrollbar">
      <table className="w-full text-[12px] border-collapse min-w-[420px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left font-semibold text-slate-500 px-3 py-2">Limit</th>
            <th className="text-left font-semibold text-slate-500 px-3 py-2">WhatsApp</th>
            <th className="text-left font-semibold text-slate-500 px-3 py-2">RCS</th>
          </tr>
        </thead>
        <tbody>
          {PLATFORM_LIMITS.map(([limit, wa, rcs], i) => (
            <tr key={limit} className={`${i > 0 ? 'border-t border-slate-100' : ''} ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
              <td className="px-3 py-2 text-slate-700">{limit}</td>
              <td className="px-3 py-2 text-slate-600">{wa}</td>
              <td className="px-3 py-2 text-slate-600">{rcs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArchitectureDiagram() {
  const layers = [
    { label: 'JSON / YAML flow definition', accent: 'bg-slate-800' },
    { label: 'Zod schema validation', accent: 'bg-indigo-600' },
    { label: 'Conversation engine (pure, unit-tested)', accent: 'bg-emerald-600' },
    { label: 'Channel renderer — RCS · WhatsApp', accent: 'bg-violet-600' },
    { label: 'Interactive phone simulator', accent: 'bg-teal-600' },
  ]
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {layers.map((layer, i) => (
        <div key={layer.label} className="flex flex-col items-center gap-1">
          <div className={`${layer.accent} text-white text-[12.5px] font-medium rounded-lg px-4 py-2 text-center shadow-sm`}>
            {layer.label}
          </div>
          {i < layers.length - 1 && <ArrowDown size={16} className="text-slate-300" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
