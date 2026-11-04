import { Sparkles } from 'lucide-react'
import { APP_VERSION } from '../../app/version'
import { CHANGELOG } from '../../app/changelog'
import { MANUAL } from './manualContent'
import { ArchitectureDiagram, CodeBlock, P, ParamTable, PlatformLimitsTable, Section } from './ManualParts'

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
          {MANUAL.toc.map((item) => (
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
          <ParamTable rows={MANUAL.interfaceGuide} />
        </Section>

        <Section id="flow-format" title="Flow definition reference" accent="emerald">
          <P>A flow is a YAML or JSON document with this top-level shape:</P>
          <CodeBlock>{`version: "1.0"
metadata: { id, name, description?, channel?, tags? }
brand: { name, shortName?, avatar?, logo?, banner?, verified?, description?, website?, supportPhone?, email?, rcsProfile? }
rcsProfile: { displayName, subtitle, brandLabel, phone, websiteLabel, websiteUrl, email, imageCount, imageUrls, privacyPolicyUrl?, termsUrl? }
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
          <ParamTable rows={MANUAL.nodeFields} />

          <h3 className="text-[13.5px] font-semibold text-slate-800 mt-4 mb-1">Message types</h3>
          <ParamTable rows={MANUAL.messageTypes} />
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
          <ParamTable rows={MANUAL.aiAuthoring} />
          <P>
            The spec document is also useful on its own: browse it directly in the repo, or copy it manually, for a
            complete reference of every message type, field, and the real WhatsApp/RCS structural limits — the same
            source of truth this Manual's message-type table and platform-limits table above are written from.
          </P>
        </Section>

        <Section id="architecture" title="Technical architecture" accent="teal">
          <P>The engine, storage, and rendering are strictly layered so scenarios stay pure data:</P>
          <ArchitectureDiagram />
          <ParamTable rows={MANUAL.architectureFiles} />
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
