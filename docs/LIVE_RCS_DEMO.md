# Live RCS demo operations

Live RCS turns an existing RCS-authored simulator flow into a two-way session for the configured test destination. It is deliberately **disabled by default**. The browser never receives Vonage credentials, sender identity, recipient configuration, or webhook secret.

## What a live run does

1. A presenter loads an RCS-authored flow and opens **Live RCS demo** in the sidebar.
2. The browser runs strict preflight: only native RCS text/media/file/card/carousel content, public media URLs, supported `reply`/`open_url` actions, and valid suggestion attachments may run.
3. The presenter supplies a short-lived operator token. It is held only in browser memory.
4. The server normalizes the requested destination and creates a persistent session only when it matches the configured test recipient. For RCS flows, the session enters `awaiting_trigger` and sends nothing until the exact `metadata.trigger` message arrives.
5. Vonage inbound and status callbacks advance the same flow graph and are shown in the presenter panel by polling.

The destination phone owns the response path during a live session. The browser composer and simulator playback are paused until the session is stopped.

## VCR environment configuration

Set these as encrypted VCR environment variables. Never add them to `.env`, the repository, a scenario file, localStorage, or browser bundles.

| Variable | Required | Purpose |
|---|---:|---|
| `LIVE_RCS_MODE` | Yes to enable | `fake` for local/development exercise; `vonage` for provider delivery; omit or use `disabled` otherwise. |
| `LIVE_RCS_TEST_RECIPIENT` | Enabled modes | The sole normalized E.164 destination permitted for Live RCS sessions. It must be pre-registered as a testing user in the RCS agent. |
| `LIVE_RCS_OPERATOR_TOKEN` | Enabled modes | Random operator-only bearer token entered for each presenter session; do not reuse a Vonage credential. |
| `LIVE_RCS_ALLOWED_FLOW_IDS` | Enabled modes | Comma-separated RCS `metadata.id` values allowed to create sessions, e.g. `singapore-airlines-boarding-pass`. |
| `LIVE_RCS_STORE_PATH` | Recommended | Path to a **VCR durable volume** JSON store. Default is a local file for development only. |
| `LIVE_RCS_STORAGE_DURABLE` | Vonage production | Set to `true` only after `LIVE_RCS_STORE_PATH` is backed by a shared durable store. |
| `LIVE_RCS_DEMO_EPHEMERAL_STORAGE` | Vonage demo alternative | Set to `true` only for one controlled single-instance Developer Mode demo; all active sessions are lost if VCR restarts or redeploys. Never set this alongside a production/multi-presenter deployment. |
| `LIVE_RCS_VONAGE_APPLICATION_ID` | Vonage | Application ID linked to the RCS agent; used for outbound JWT generation and signed-webhook claim validation. |
| `LIVE_RCS_VONAGE_JWT` | Vonage, optional | Explicit short-lived application JWT. Prefer `LIVE_RCS_VONAGE_PRIVATE_KEY` instead. |
| `LIVE_RCS_VONAGE_PRIVATE_KEY` | Vonage, preferred | Application RSA private key (PEM, stored as a VCR secret); the server generates five-minute JWTs. |
| `LIVE_RCS_VONAGE_SIGNATURE_SECRET` | Vonage | Dashboard signature secret used to verify the HS256 `Authorization: Bearer` JWT on Messages webhooks. |
| `LIVE_RCS_RCS_AGENT_ID` | Vonage | Provisioned Vonage RCS agent/sender identity. |
| `LIVE_RCS_VONAGE_API_URL` | Optional | Defaults to `https://api-eu.vonage.com/v1/messages`. Override only for an approved regional/API endpoint. |

### Safe development smoke configuration

Use this only on a local machine or a protected VCR environment. It exercises the full server/session/inbound/status path without calling Vonage:

```bash
export LIVE_RCS_MODE=fake
export LIVE_RCS_TEST_RECIPIENT='+15551234567'
export LIVE_RCS_OPERATOR_TOKEN='replace-with-a-random-development-token'
export LIVE_RCS_ALLOWED_FLOW_IDS='singapore-airlines-boarding-pass'
npm start
```

Open the simulator, select the Singapore Airlines RCS scenario, paste the token into **Live RCS demo**, and start the run. Fake sessions can be driven through the webhook routes for automated/manual testing.

## Vonage application checklist

Before setting `LIVE_RCS_MODE=vonage`:

1. Confirm the agent is enabled in **Developer Mode**, its RCS sender/agent ID, and that the configured test recipient is pre-registered as a testing user.
2. Confirm the application ID, application private key (or short-lived JWT), signature secret, and exact Messages API endpoint for the account/region.
3. Register public HTTPS callbacks on the Vonage application:
   - `POST https://<vcr-domain>/webhooks/vonage/inbound`
   - `POST https://<vcr-domain>/webhooks/vonage/status`
4. Messages callbacks use a signed HS256 JWT in the `Authorization: Bearer` header. The server validates its issuer, application ID, issue time, replay ID, and raw-body `payload_hash` with `LIVE_RCS_VONAGE_SIGNATURE_SECRET`; do not configure a custom `X-Vonage-Signature` HMAC header.
5. For production, attach `LIVE_RCS_STORE_PATH` to durable VCR storage and set `LIVE_RCS_STORAGE_DURABLE=true`. For one controlled Developer Mode demo only, set `LIVE_RCS_DEMO_EPHEMERAL_STORAGE=true` instead; any restart, redeploy, or instance replacement loses active sessions and prevents the phone from continuing that flow.
6. Allowlist only tested flow IDs and rotate the operator token/JWT after demos.

The public readiness endpoint is `GET /api/live/diagnostics`. It deliberately returns only mode, masked recipient, allowlisted IDs, storage readiness, and missing-configuration messages — never tokens, JWTs, or secrets.

## Current provider boundary

`fake` mode exercises text, media, cards, carousels, postbacks, free text, lifecycle events, idempotency, and persistence without network delivery.

The checked-in `VonageRcsGateway` serializes documented Messages API RCS text/suggestions, image/video/file, standalone-card, and carousel envelopes. Stable scenario interaction IDs are sent as `postback_data` and accepted from inbound reply/button callbacks. Live RCS prose is sent as plain text, so the simulator's `**bold**` / `_italic_` authoring markers are removed on the wire because RCS text fields do not render Markdown. Keep `LIVE_RCS_MODE=disabled` until the VCR secrets, agent linkage, callback configuration, and durable session store are confirmed; the serializer is tested with redacted official payload shapes but has not yet sent through this particular agent.

## Live diagnostics page

The **Live logs** page is protected by the operator token and polls the authenticated session list and log endpoint. Use it after a test click to select the live session, inspect the sanitized inbound webhook field shapes, identity/correlation result, errors, and outbound provider IDs, then use **Copy diagnostics** to copy the JSON. Bearer tokens, webhook signatures, and raw callback bodies are never included in the copied output. Diagnostic entries are held in the running VCR instance, so copy them before restarting or redeploying it.

## Webhook behavior and recovery

- Webhook bodies are capped at 100 KB and must be JSON.
- In `vonage` mode, the server validates Vonage's signed HS256 `Authorization: Bearer` JWT, including `iss`, `application_id`, `iat`, `jti`, and `payload_hash`. In fake mode callbacks are accepted only for local exercise.
- Recently seen webhook `jti` values are rejected for five minutes to reduce replay; inbound delivery IDs are separately deduplicated per session.
- Status callbacks update the matching stored provider message ID (`submitted`, `delivered`, `read`, `rejected`, or `undeliverable`).
- Stop a session in the presenter UI to clear pending reply correlations. If an inbound callback cannot be matched, inspect server logs using the session/provider IDs, then start a new session rather than replaying an unknown event.

## Live-compatible authoring rules

- Set `metadata.channel: rcs` and a unique, non-empty `metadata.trigger`.
- The first inbound text must equal the trigger after Unicode NFC normalization, outer-whitespace trimming, and lowercase casing. Matching is full-string exact; internal whitespace, punctuation, extra text, keyword matching, and fuzzy matching are not accepted.
- The entry trigger is separate from legacy top-level `triggers`, which remain in-flow shortcuts after startup.
- Images, videos, documents, and rich-card/carousel media must resolve to public HTTPS URLs when deployed. VCR-root paths such as `/assets/singapore-airlines/boarding-pass-demo.pdf` are resolved against the live VCR origin.
- Use only `reply` or `open_url` actions in live RCS content. `system_action`, lists, simulator-only cards, and call/location/calendar/custom action variants fail preflight.
- Keep RCS limits: text ≤ 3,000 UTF-8 characters; media URL ≤ 2,000 characters; file ≤ 100 MB; carousel 2–10 cards; reply chips ≤ 11; action chips/card buttons ≤ 4.

The Singapore Airlines scenario is the reference live-safe flow. Its boarding pass is a public PDF asset rather than a local simulator download/wallet action.


### Single-instance Developer Mode storage

`LIVE_RCS_DEMO_EPHEMERAL_STORAGE=true` is an explicit alternative to durable storage for one presenter, one configured test destination, and one short Developer Mode session. It uses the local JSON file store and permits `vonage` mode only because the presenter accepts these limitations:

- Any VCR restart, redeploy, crash, or instance replacement loses the active session, message correlation IDs, and webhook-deduplication state.
- The phone may still receive a message after a restart, but its next reply cannot safely resume the old flow; start a new demo instead.
- Never use this mode for production traffic, multiple presenters, multiple replicas, or any journey where delivery continuity matters.

For all other cases, use a shared transactional datastore and `LIVE_RCS_STORAGE_DURABLE=true`.
