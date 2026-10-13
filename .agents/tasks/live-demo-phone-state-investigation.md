# Live-demo phone-state investigation

## Summary answer

The current implementation can tell the presenter the **server-side flow position** of the live session, but it does not mirror the real test phone on the app simulation screen. The dedicated **Live logs** page exposes `currentNodeId`, session status, outbound-message count, session events, and sanitized webhook diagnostics; the Live RCS sidebar only shows status and the last five event labels. The phone-shaped simulator itself continues to render the local Zustand simulator state and is not driven by live webhook responses or logs.

The real phone's reply can advance the server's flow graph, and the server records enough coarse information to reconstruct a conversation timeline, but no current client code converts that live session into the simulator's `history`/`NormalizedMessage` model. The best fix is a server-authoritative, presenter-only live conversation projection: expose an explicit normalized live timeline plus current state, map it into a separate live view in the client, and render that view in the existing phone components while live mode is active.

## Evidence

### 1. What the server already knows

- `server/liveDemo.js` — `LiveDemoService.createSession()` creates a session with `status: 'starting'`, `currentNodeId: null`, `pendingInput`, `variables`, `outbound`, and `events`, then calls `enterNode()`.
- `server/liveDemo.js` — `LiveDemoService.enterNode()` sets `session.currentNodeId = nodeId`, emits `node_entered`, sends every supported content item through the gateway, stores each outbound provider ID/content/status, and emits an `outbound` event. It then sets `status` to `awaiting_reply` or `completed` as appropriate. This is the authoritative graph position after automatic transitions as well as interactive nodes.
- `server/liveDemo.js` — `LiveDemoService.handleInbound()` identifies a session using the event ID, postback correlation, or an awaiting session; routes reply postbacks through `session.correlation`; routes text through global triggers or `pendingInput`; emits `inbound_reply`, `inbound_text`, or `inbound_unsupported`; records `inbound_routed`; and calls `enterNode()` for the next node. Therefore a successful webhook does advance the same node graph used to send the next phone message.
- `server/liveDemo.js` — `handleStatus()` matches provider callbacks to `session.outbound`, updates the provider status, and emits a `status` event. These statuses provide delivery/provider information, not handset UI state.
- `server/liveDemo.js` — `sessionView()` removes `flow`, `correlation`, `processedInbound`, and `publicBaseUrl`, but leaves the public session's `currentNodeId`, `pendingInput`, `variables`, `outbound`, and `events`. `diagnosticsLog()` returns that session view plus the sanitized process-level diagnostic events.
- `server/app.js` — authenticated `GET /api/live/sessions/:id` returns the current session view, and authenticated `GET /api/live/logs?sessionId=...` returns the session plus diagnostics. The webhook route records `currentNodeId` in its `webhook_processed` diagnostic entry.

Available session event types include `session_started`, `session_restarted`, `node_entered`, `outbound`, `inbound_reply`, `inbound_text`, `inbound_unsupported`, `status`, and `session_stopped`. Additional diagnostics include inbound receipt/rejection/routing, webhook receipt/processing/errors, duplicate/replay handling, and unmatched sessions.

### 2. What the current UI exposes

- `src/components/live/LiveDiagnosticsPage.tsx` — the top navigation exposes a **Live logs** page through `src/components/layout/AppHeader.tsx` and `src/app/pages.ts`. The page polls `/api/live/sessions` and `/api/live/logs` every 2.5 seconds after an operator token is supplied. It displays session status, `currentNodeId`, event count, outbound count, and the sanitized diagnostic timeline. This is currently the clearest way to identify the server's current flow node.
- `src/components/controls/LiveRcsControls.tsx` — the sidebar polls `/api/live/sessions/:id` every 2.5 seconds while a session is active, but its `LiveSession` interface only consumes `id`, `status`, `recipient`, and `events`. It renders only the status and the last five event labels; it does not render `currentNodeId` or outbound content.
- `src/components/phone/Composer.tsx` — when `liveSessionActive` is true, the phone composer is replaced with “Live RCS is active · reply from the test phone” and a server restart button. This correctly prevents the browser from pretending to be the user, but it also confirms there is no live inbound interaction control in the simulator.
- `src/components/phone/PhoneScreen.tsx` — the phone always renders `ConversationView` and `Composer` from the normal simulator store under the selected channel renderer. There is no live-session history prop or live timeline source.
- `src/components/phone/ConversationView.tsx` — the conversation is built from `useSimulatorStore((s) => s.history)`, with `currentNodeId`, `pendingOutcome`, and local interaction handlers. It does not read the server session or diagnostics.
- `src/store/simulatorStore.ts` — `liveSessionActive` is only a gate: `goToNode`, `applyInteractionResult`, `handleAction`, `restart`, and other local controls return early while live mode is active. `setLiveSessionActive(true)` stops local playback, and `setLiveSessionActive(false)` clears the live credentials. There is no action that copies a fetched live session into `history`, `events`, `currentNodeId`, or `variables`.
- `src/store/simulatorStore.ts` — `restartLiveSession()` only POSTs to `/api/live/sessions/:id/restart` and shows a toast. It does not fetch or apply the restarted server session to the phone UI.

Conclusion from these paths: the app already provides a server-state/log view, but the simulation phone cannot currently be used as a live mirror. Starting a live run does not make the phone screen show the server's outbound messages, and receiving a webhook does not add the phone user's reply or the next outbound node to the simulator history.

### 3. Whether responses/logs are sufficient to replay

They are sufficient for a **coarse semantic replay**, but not directly consumable by the current simulator:

- The server stores outbound content with `nodeId`, timestamp, provider ID, delivery status, and a content object. It stores inbound reply labels/postback IDs or inbound text and the resulting node transition. This is enough to identify the sequence of flow nodes and user choices.
- The server content shape is a live/provider shape, not the browser's `NormalizedMessage`/`RenderableMessage` shape. For example, `server/liveDemo.js` emits `file` and `card` content while the client schema/renderers use `document` and `rich_card`; carousel/card action structures also need adaptation.
- `collectContent()` intentionally does not emit `input`, `typing`, or `delay` as ordinary outbound content. An input prompt is represented server-side by `pendingInput`, so a replay layer must preserve that state rather than infer every authored message from outbound records.
- The server records provider statuses such as submitted/delivered/read/rejected/undeliverable, but it does not receive a signal that the user has opened a particular message, is looking at a particular native phone screen, or has entered a system UI. `currentNodeId` means “where the bot's state machine is waiting/running,” not an exact handset viewport.

The existing tests verify this server-side capability: `server/liveDemo.test.js` covers initial outbound content, postback routing, current completion, free-text triggers/input, deduplication, and status callbacks; `server/app.test.js` covers the live routes and signed webhook behavior. There is no test asserting live session data updates `src/components/phone/*` or the Zustand simulator history.

## Conclusions

1. **Can the presenter know the current user-phone step today?** Yes, at the flow-state level: open **Live logs**, authenticate with the operator token, select the session, and read `Current node`, session status, events, and diagnostics. The sidebar gives only a reduced event summary. No current UI can show the actual native RCS screen or prove what the person is currently viewing.
2. **Can the app simulation screen currently replicate the live steps?** No. Live mode deliberately pauses/local-disables the browser simulator, but it stops there; it does not replace local history with live outbound/inbound history.
3. **Can it be implemented from current responses/logs?** Yes, for a faithful flow-conversation projection. The server has node IDs, outbound content, inbound choices/text, variables, pending input, and delivery state. A normalizer and explicit API contract are still required; blindly replaying raw diagnostics is not enough.

## Recommended implementation

Use the server session as the source of truth while `liveSessionActive` is true, and keep the ordinary local simulator state separate so starting/stopping a real run cannot corrupt local playback/back snapshots.

1. **Expose a normalized live timeline from the server.** Modify `server/liveDemo.js` and the response handling in `server/app.js` to expose a versioned `liveTimeline` (or equivalent) alongside the existing raw `outbound` diagnostics. Each item should include `id`, `at`, `nodeId`, `sender` (`business` or `user`), and a client-renderable message shape. Add inbound user items when `inbound_reply` or recognized `inbound_text` is processed, using the selected reply label or received text. Keep raw provider payload/content and statuses for diagnostics. Include `currentNodeId`, `status`, `pendingInput`, and `variables` in the live snapshot. Do not expose correlation maps, credentials, webhook bodies, or secrets.
2. **Add a client projection boundary.** Create a helper such as `src/live/liveSessionProjection.ts` to validate/map the API snapshot into `NormalizedMessage[]` and a small live-session view model. Add corresponding separate live state and a `syncLiveSession` action in `src/store/simulatorStore.ts`; update `src/components/controls/LiveRcsControls.tsx` to sync immediately after start and on every 2.5-second poll, and clear it on stop. This avoids trying to drive local `goToNode()` (which would resend messages) and avoids treating a real-phone reply as a locally simulated click.
3. **Render the projection in the existing phone.** Update `src/components/phone/PhoneScreen.tsx`/`ConversationView.tsx` and the relevant selectors in `src/messages/MessageRenderer.tsx` so live mode reads the projected live history/current node/variables while normal mode remains unchanged. Show a compact presenter-only state badge in or immediately above the conversation (node label plus status and last event time); retain the existing composer lock and restart behavior. The flow node label can come from the client’s already-loaded flow, with the server `currentNodeId` as the stable identity.
4. **Make the operator state explicit.** Extend the sidebar live summary in `src/components/controls/LiveRcsControls.tsx` to show `currentNodeId`/node label and the most recent inbound/outbound event, linking the summary to the same live snapshot rendered in the phone. Keep `src/components/live/LiveDiagnosticsPage.tsx` as the detailed raw/sanitized troubleshooting view.
5. **Add regression coverage.** Extend `server/liveDemo.test.js` with timeline assertions for initial outbound, reply, free text/input, and restart; add route/API shape assertions in `server/app.test.js`; add unit tests for `src/live/liveSessionProjection.ts`; and add a component/store test that a polled live snapshot changes the phone conversation and current node without enabling local interaction. Continue using the fake gateway for deterministic tests.

## Verification performed and limitations

Command run:

```bash
npm test -- --run server/liveDemo.test.js server/app.test.js src/components/controls/LiveRcsControls.test.tsx
```

Result: **3 test files passed, 12 tests passed**. This exercised the fake live gateway, session transitions, inbound postbacks/free text, provider-status updates, authenticated routes, webhook verification, and the current Live RCS controls. It did not prove phone mirroring because the repository has no such implementation or test.

No VCR server was started or restarted, and no Vonage request or real test-phone delivery was performed. The repository was already in a heavily modified/uncommitted state when inspected; this investigation did not modify application files. The requested report directory did not exist initially and was created only to write this report.
