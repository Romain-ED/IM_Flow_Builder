import type { ReactNode } from 'react'
import { ArrowDown, Sparkles } from 'lucide-react'
import { APP_VERSION } from '../../app/version'
import { CHANGELOG } from '../../app/changelog'

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'interface', label: 'Interface guide' },
  { id: 'flow-format', label: 'Flow definition reference' },
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
            This is an interactive, browser-only prototyping tool for conversational business messaging journeys —
            RCS Business Messaging, WhatsApp Business, and a channel-neutral "generic" mode. You load a flow written
            in JSON or YAML and immediately walk through it as if you were the customer, inside a realistic
            phone-shaped chat UI.
          </P>
          <P>
            It is <strong>not connected to any real messaging API</strong>. It exists for demos, customer workshops,
            sales engineering, solution-architecture walkthroughs, and conversational UX design — a place to iterate
            on a flow definition and see it rendered and interacted with instantly, in whichever channel's visual
            language you pick.
          </P>
          <P>
            Everything — the flow you're editing, your channel/variable preferences, and any custom scenarios you
            save — lives in this browser's local storage. Nothing is sent to a server.
          </P>
        </Section>

        <Section id="interface" title="Interface guide" accent="violet">
          <P>The main Simulator screen has three regions: a control sidebar, the phone preview, and an optional flow inspector.</P>
          <ParamTable
            rows={[
              ['Scenario', 'Shows the loaded flow\'s name, a dropdown of built-in examples, "Edit flow" (opens the quick JSON/YAML editor for the live flow), "Export" (downloads the current flow as YAML), and "Copy share link" (encodes the flow into a URL — opening it loads the same scenario, no file needed).'],
              ['Channel', 'Switches the rendering between RCS, WhatsApp, and Generic. The same flow definition renders through each channel\'s own visual language and capability set. "Compare all channels" shows all three at once, driven by the same live conversation — tap a button in any one and the others follow.'],
              ['Variables', 'Editable list of the flow\'s top-level variables (e.g. customer name, booking reference, seat). Edits apply on the next Restart, not live — this lets a presenter line up several fields before restarting the demo.'],
              ['Debug options', '"Fast demo mode" shrinks all typing/message delays; "Show capability warnings" toggles the inline notes shown when a message type falls back to a generic rendering on a channel that doesn\'t natively support it; "Flow inspector panel" toggles the right-hand debug drawer; "Start node" overrides which node Restart jumps to.'],
              ['Playback', 'Restart (replays from the start node using the current variable values), Back (undoes the last user interaction using a state snapshot), Pause/Resume (freezes automatic playback), Clear (same as Restart).'],
              ['Phone preview', 'The focal point — a realistic mobile chat UI rendering the live conversation for the selected channel.'],
              ['Flow inspector', 'Shows the current node id, live variable values, the node-visit history (click any entry to jump straight to that node), validation errors if any, and a recent event log. The "Flow graph" section has a List/Graph toggle — Graph lays out every node and connection automatically and lets you click any box to jump straight to it live. The same graph view (read-only there) is also available while editing a scenario on the Scenarios page.'],
              ['Presenter mode', 'Hides all configuration chrome and enlarges the phone for screen-sharing with customers; a small floating control keeps Restart and fullscreen within reach.'],
            ]}
          />
        </Section>

        <Section id="flow-format" title="Flow definition reference" accent="emerald">
          <P>A flow is a YAML or JSON document with this top-level shape:</P>
          <CodeBlock>{`version: "1.0"
metadata: { id, name, description?, channel?, tags? }
brand: { name, shortName?, avatar?, logo?, verified?, website?, supportPhone? }
defaults: { messageDelayMs?, typingDurationMs?, locale?, timezone?, showTimestamps? }
variables: { ...any key/value pairs used by {{templating}} }
start: "<id of the first node>"
nodes: [ ...FlowNode ]`}</CodeBlock>

          <h3 className="text-[13.5px] font-semibold text-slate-800 mt-2 mb-1">Node fields</h3>
          <ParamTable
            rows={[
              ['id', 'Unique identifier other nodes/actions reference via "next".'],
              ['messages', 'Ordered list of messages/pseudo-messages to play when the node is entered.'],
              ['actions', 'Persistent suggested-reply / button bar shown once messages finish playing.'],
              ['set', 'Variables to assign unconditionally as soon as the node is entered.'],
              ['condition / then / else', 'Declarative branch: variable + operator (equals, not_equals, exists, contains, greater_than, less_than) + value, routing to "then" or "else".'],
              ['next', 'Automatic transition to another node once messages finish, when there is no condition or actions bar.'],
              ['end', 'Marks a deliberate end of the scenario.'],
            ]}
          />

          <h3 className="text-[13.5px] font-semibold text-slate-800 mt-4 mb-1">Message types</h3>
          <ParamTable
            rows={[
              ['text', 'Multiline text, basic URL auto-linking, **bold**/_italic_.'],
              ['image / video / document', 'Media with graceful broken-asset fallback; document taps simulate a download.'],
              ['rich_card / carousel', 'Standalone card, or a horizontally scrollable row of cards, each with its own action buttons.'],
              ['suggested_replies / suggested_actions', 'Inline reply chips, or richer actions (open_url, call, location, calendar, custom) shown as a simulated modal/toast.'],
              ['list', 'Opens a bottom-sheet menu of grouped rows.'],
              ['input', 'Free-text/email/phone/numeric/date entry that drives the composer and stores the value in a variable.'],
              ['flight_card / boarding_pass', 'Purpose-built travel components; boarding passes get Download / Add to wallet / View buttons for free.'],
              ['location', 'A map-preview card with a label/address and an "Open in Maps" simulated action.'],
              ['otp', 'A segmented verification-code entry with its own Verify button; stores the code in a variable like input.'],
              ['payment_request', 'A "Pay now" card (title, description, amount) that simulates a charge and can transition on completion.'],
              ['calendar_event', 'A rich calendar-invite card (title, time, location) with "Add to calendar".'],
              ['product_catalog', 'A horizontally scrollable row of products, each with its own "Add to cart" (simulated, no real cart state).'],
              ['whatsapp_flow', 'A placeholder card representing an embedded WhatsApp Flow, with a configurable CTA that simulates completion.'],
              ['system_action', 'A compact, centered simulator notice (e.g. "Boarding pass downloaded") — not a business or user chat bubble. Suppresses the automatic typing indicator.'],
              ['typing', 'Pseudo-message: shows the typing indicator for duration ms, then disappears — never stored in history. Useful before a system_action.'],
              ['delay', 'Pseudo-message: pause without rendering anything.'],
            ]}
          />
          <P>
            Templating uses <code>{'{{variableName}}'}</code> — plain regex substitution against the current
            variables, recursively applied to every string field in a message. There is no expression language and
            nothing is ever evaluated as code.
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

function ArchitectureDiagram() {
  const layers = [
    { label: 'JSON / YAML flow definition', accent: 'bg-slate-800' },
    { label: 'Zod schema validation', accent: 'bg-indigo-600' },
    { label: 'Conversation engine (pure, unit-tested)', accent: 'bg-emerald-600' },
    { label: 'Channel renderer — RCS · WhatsApp · Generic', accent: 'bg-violet-600' },
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
