# Requirements: Live-demo phone state mirror

## Summary

Add a presenter-facing live conversation projection to the app simulation. While a live demo session is active, the phone simulation must show a server-authoritative, chronological representation of business messages sent to the real test phone and user replies received from it, together with the current flow state. The projection must be derived from a safe normalized session snapshot rather than raw webhook/provider diagnostics, and must remain isolated from the existing local simulator history and interactions.

This feature represents the semantic conversation and flow position known by the server; it does not claim to reproduce the real handset's exact native viewport, system UI, unread state, or what the person is physically viewing.

Assumptions:
- The existing authenticated live-session endpoints and 2.5-second polling cadence remain the integration basis unless the implementation requires a backward-compatible response extension.
- The selected flow is available in the client, so a `currentNodeId` can be resolved to a node label when that node exists locally. The ID remains authoritative when no label is available.
- A user inbound event is considered part of the mirror only once the server has recognized and routed it (reply/postback or recognized text), not merely when an unrelated webhook is received.
- Existing local simulator behavior outside live mode must remain unchanged.

## Functional Requirements

### 1. Safe live-session snapshot and timeline

1. The live-session API must expose an explicit normalized snapshot suitable for presenter UI, while preserving existing API consumers where practical. The snapshot must include the current flow node ID, session status, pending input state, variables needed by the presenter projection, and a chronological conversation timeline.
2. Every timeline item must have a stable identifier, timestamp, sender (`business` or `user`), client-renderable message/content data, and a node ID when the item can be associated with a flow node. Items without a known node must remain representable rather than being discarded.
3. The normalized timeline must include business outbound messages and recognized user inbound replies/text in chronological order. Repeated polling of an unchanged session must not duplicate items or change their stable identity.
4. The contract must support all live content and interaction structures that the existing phone renderer is expected to display: text, media, file/document, cards/rich cards, carousels, and their supported actions, plus user reply and user text entries. Unsupported or malformed content must not make the entire snapshot unusable.
5. Provider delivery/status information and troubleshooting diagnostics must remain separate from renderable conversation content. The live UI may use status information for activity/state display, but must not need raw provider payloads to render the mirror.
6. The response must not expose credentials, secrets, correlation maps, processed inbound identifiers, webhook bodies, private routing data, or equivalent internal-only diagnostics through the presenter snapshot. Detailed sanitized diagnostics remain the responsibility of the existing diagnostics view.

### 2. Coherent state across live-session events

7. The snapshot/timeline must remain coherent through session creation and initial outbound messages, recognized inbound postbacks/replies, recognized inbound text, node transitions, automatic transitions, completion, restart, and provider status updates.
8. A recognized inbound reply must appear as a user timeline item with its displayable reply/text representation before or alongside the resulting business messages, and the resulting `currentNodeId` must reflect the server's flow state.
9. A recognized inbound text must appear as a user text item, including when it satisfies a text input or trigger, and the snapshot must expose the resulting flow state. Unrecognized or unsupported inbound activity may remain diagnostics-only and must not be presented as a successful user conversation item.
10. Pending input must be represented explicitly through the snapshot's pending-input state. The projection must not invent typing indicators, delays, input messages, or other handset events that the server did not record.
11. Restart must yield a fresh, coherent live projection for the restarted session, including the new initial state/messages and appropriate activity/status, without retaining stale messages from the prior run. Provider status updates must update the relevant live state/activity without being misrepresented as user or business conversation messages.

### 3. Client projection and isolated live state

12. The client must validate and map the normalized API snapshot at a projection boundary into the phone renderer's established message model. Invalid fields, missing optional values, unknown content types, and unsupported action variants must be handled safely and must not crash the phone screen.
13. Live projection state must be stored separately from ordinary Zustand/local simulator history, node state, variables, and back-navigation state. Syncing server data must not mutate the local simulation history or cause local messages to be resent.
14. Starting live mode must immediately synchronize the live projection, then refresh it on the existing live-session polling cadence. The implementation must not introduce an additional independent polling loop.
15. Stopping live mode must clear the live projection and its presenter-only state. Restarting a live session must refresh the projection so the phone and sidebar show the restarted server state rather than the previous run.
16. While live mode is active, server timeline data must be the source for the phone conversation. Local simulator operations such as `goToNode`, applying a local interaction result, or handling a local action must not be triggered by synchronization and must not send messages to the live phone.
17. When live mode is inactive, the phone must continue to render the normal simulator history and interactions exactly as before. Switching modes must not corrupt either representation.

### 4. Phone and presenter UI

18. The existing phone simulation must render the live projected conversation while live mode is active, including supported business content and user reply/text entries through the established renderers.
19. The live conversation must show a compact presenter-visible state indicator near the conversation containing the current node label when resolvable, the current session status, and recent activity/time. If a node label cannot be resolved, the stable node ID or an explicit unavailable state must be shown instead of an empty or misleading label.
20. The live composer must remain locked to real-phone input while live mode is active. The presenter must retain the existing restart behavior and must not be offered controls that simulate a user reply locally.
21. The live sidebar summary must use the same synchronized snapshot as the phone and show the current node/node label, latest inbound activity, latest outbound activity, and session status. It must not require the presenter to open the detailed diagnostics page for this summary.
22. The existing Live Diagnostics page must remain available as the detailed diagnostics/troubleshooting surface; this feature must not replace it with raw provider data in the phone or sidebar.

### 5. Verification and compatibility

23. Existing server and client behavior must remain compatible for normal simulation mode and for existing live-session consumers that do not use the new normalized projection fields.
24. Focused regression coverage must verify the normalized server snapshot/timeline for initial outbound, inbound reply, recognized text/input, transitions, restart, and provider status updates; the client projection for supported content and malformed/unsupported inputs; and state/UI behavior proving that live synchronization updates the phone without enabling local interaction.
25. The implementation must be validated with the repository's applicable targeted tests and available typecheck, lint, or build commands, plus a minimal live API/runtime exercise when feasible. If browser visual verification is unavailable, that limitation must be recorded rather than treating it as complete visual validation.

## Non-Functional Requirements

- **Security and privacy:** Presenter-facing responses must follow least exposure and must never include credentials, secrets, raw webhook bodies, correlation maps, processed inbound IDs, or equivalent internal routing data.
- **Consistency:** The phone and sidebar must derive their displayed live state from the same synchronized snapshot, with deterministic ordering and stable item IDs across polling.
- **Resilience:** A partial, delayed, malformed, or unsupported live payload must produce a safe degraded presentation or clear unavailable state, not crash the simulator or corrupt local mode. Network/session fetch failures must leave the last valid projection usable where possible and visibly indicate stale/unavailable state according to existing UI conventions.
- **Performance and scope:** Reuse the existing polling cadence and established React/TypeScript/Zustand patterns; do not add unnecessary dependencies or polling loops. Normal local simulation must not incur live synchronization work when live mode is inactive.
- **Testability:** Server normalization, client mapping/validation, state synchronization, and presenter rendering must be separable enough for focused unit and integration/component tests.

## Acceptance Criteria

1. Given a newly started live session with one or more outbound messages, the authenticated live-session response contains a normalized snapshot with current node, status, pending-input state, variables, and an ordered business timeline whose items have stable IDs, timestamps, sender, node association where known, and client-renderable content.
2. Given the real phone sends a recognized reply/postback, the next synchronized snapshot contains a user timeline item for that reply and reflects the server's resulting node transition; the phone projection displays the user entry and any subsequent outbound business messages in chronological order.
3. Given the real phone sends recognized free text, the synchronized projection displays that text as a user entry and reflects the resulting trigger/input transition. An unsupported or unrecognized inbound event is not fabricated into a successful conversation entry.
4. Given outbound text, media, file/document, card/rich-card, carousel, and supported action content, the client projection validates/maps each supported shape to the existing phone message renderer; malformed or unknown content is skipped or shown as an explicit safe unavailable item without crashing the phone or sidebar.
5. Given a pending input state, the presenter sees the pending-input/current-state indicator and no invented typing, delay, or input message appears in the conversation.
6. Given provider delivery/status callbacks, the relevant snapshot/activity/status changes are visible as provider/session state or diagnostics, while the callback is not rendered as an additional user or business message.
7. Given a live session restart, the phone and sidebar refresh to the restarted session's state and timeline, with no stale prior-run conversation items. Given live mode is stopped, the live projection is cleared and the ordinary local simulation history is restored unchanged.
8. Given live polling occurs repeatedly without new server events, the phone and sidebar do not duplicate timeline items, reorder existing items unexpectedly, or alter stable item IDs. Given a fetch fails after a valid snapshot, the last valid view is not corrupted and the UI exposes an appropriate stale/unavailable state.
9. While live mode is active, the composer directs the presenter to reply from the real test phone and local simulator actions cannot resend messages or advance the server session. While live mode is inactive, existing local simulator interactions continue to work as before.
10. The phone's presenter indicator shows session status, recent activity/time, and the current node label when available (or a truthful fallback); the sidebar shows the same current node/state plus latest inbound and outbound activity from the same synchronized snapshot.
11. Existing targeted server tests, client projection/store/UI tests, and applicable typecheck/lint/build checks pass, and the documented runtime/API exercise confirms the live snapshot can be fetched and projected. Any unavailable browser visual check is explicitly documented.

## Out of Scope

- Reproducing the exact native test-phone viewport, operating-system UI, notification state, scroll position, read/open state, keyboard, or what the user is physically looking at.
- Sending replies, selecting actions, or otherwise simulating the real user's interaction from the presenter phone UI.
- Replacing the existing detailed Live Diagnostics page or exposing raw webhook/provider payloads in presenter-facing conversation UI.
- Adding new live transport mechanisms, real-time sockets, or independent polling loops when the existing polling cadence is sufficient.
- Changing normal local simulator flow behavior, local history semantics, or unrelated simulator features.
- Adding unsupported provider content types or inferring unrecorded typing/delay/input events.
- Persisting a separate historical archive beyond the live session data needed to render the current projection.
