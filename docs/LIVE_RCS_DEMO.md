# Live RCS demo operations

Live RCS turns an existing RCS-authored simulator flow into a fixed-recipient, two-way session. It is deliberately **disabled by default**. The browser never receives Vonage credentials, sender identity, recipient configuration, or webhook secret.

## What a live run does

1. A presenter loads an RCS-authored flow and opens **Live RCS demo** in the sidebar.
2. The browser runs strict preflight: only native RCS text/media/file/card/carousel content, public media URLs, supported `reply`/`open_url` actions, and valid suggestion attachments may run.
3. The presenter supplies a short-lived operator token. It is held only in browser memory.
4. The VCR server creates a persistent session for the configured test number, sends content through the selected gateway, and stores provider IDs/events.
5. Vonage inbound and status callbacks advance the same flow graph and are shown in the presenter panel by polling.

The test phone owns the response path during a live session. The browser composer and simulator playback are paused until the session is stopped.

## VCR environment configuration

Set these as encrypted VCR environment variables. Never add them to `.env`, the repository, a scenario file, localStorage, or browser bundles.

| Variable | Required | Purpose |
|---|---:|---|
| `LIVE_RCS_MODE` | Yes to enable | `fake` for local/development exercise; `vonage` for provider delivery; omit or use `disabled` otherwise. |
| `LIVE_RCS_TEST_RECIPIENT` | Enabled modes | One fixed E.164 test MSISDN. Browser input is intentionally not supported. |
| `LIVE_RCS_OPERATOR_TOKEN` | Enabled modes | Random operator-only bearer token entered for each presenter session; do not reuse a Vonage credential. |
| `LIVE_RCS_ALLOWED_FLOW_IDS` | Enabled modes | Comma-separated RCS `metadata.id` values allowed to create sessions, e.g. `singapore-airlines-boarding-pass`. |
| `LIVE_RCS_STORE_PATH` | Recommended | Path to a **VCR durable volume** JSON store. Default is a local file for development only. |
| `LIVE_RCS_STORAGE_DURABLE` | Vonage | Set to `true` only after `LIVE_RCS_STORE_PATH` is backed by VCR-managed persistent storage. |
| `LIVE_RCS_WEBHOOK_SECRET` | Vonage | Shared secret used to HMAC-SHA256 verify raw webhook bodies. |
| `LIVE_RCS_VONAGE_JWT` | Vonage | Application JWT; server-only. |
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

1. Confirm the agent is enabled in **Developer Mode**, its RCS sender/agent ID, and the single approved test MSISDN.
2. Confirm the application JWT/authentication setup and the exact Messages API endpoint for the account/region.
3. Register public HTTPS callbacks on the Vonage application:
   - `POST https://<vcr-domain>/webhooks/vonage/inbound`
   - `POST https://<vcr-domain>/webhooks/vonage/status`
4. Configure the provider's webhook signing/verification setting to match `LIVE_RCS_WEBHOOK_SECRET`; send a signed test callback before sending a message.
5. Attach `LIVE_RCS_STORE_PATH` to durable VCR storage and set `LIVE_RCS_STORAGE_DURABLE=true`. The default filesystem is not a production durability guarantee.
6. Allowlist only tested flow IDs and rotate the operator token/JWT after demos.

The public readiness endpoint is `GET /api/live/diagnostics`. It deliberately returns only mode, masked recipient, allowlisted IDs, storage readiness, and missing-configuration messages — never tokens, JWTs, or secrets.

## Current provider boundary

`fake` mode exercises text, media, cards, carousels, postbacks, free text, lifecycle events, idempotency, and persistence without network delivery.

The checked-in `VonageRcsGateway` uses the verified Messages API text envelope and deliberately rejects rich content until its exact payload shape is confirmed against the provisioned agent's authenticated Messages API reference. This is a fail-closed guard: it prevents a card/carousel/media demo from emitting guessed provider JSON. Before enabling a real rich demo, add the reviewed agent-specific mapping in `server/liveDemo.js`, fixture-test it with redacted official payloads, and perform a single benign Developer Mode send.

## Webhook behavior and recovery

- Webhook bodies are capped at 100 KB and must be JSON.
- In `vonage` mode, the raw body must have a valid `X-Vonage-Signature` HMAC-SHA256 signature. In `fake` mode unsigned callbacks are accepted for local exercise only.
- Duplicate inbound callback IDs are ignored, preventing duplicate node transitions.
- Status callbacks update the matching stored provider message ID (`submitted`, `delivered`, `read`, `rejected`, or `undeliverable`).
- Stop a session in the presenter UI to clear pending reply correlations. If an inbound callback cannot be matched, inspect server logs using the session/provider IDs, then start a new session rather than replaying an unknown event.

## Live-compatible authoring rules

- Set `metadata.channel: rcs`.
- Use text, image, video, document, rich card, carousel, suggested replies/actions, and `input` only.
- Images, videos, documents, and rich-card/carousel media must resolve to public HTTPS URLs when deployed. VCR-root paths such as `/assets/boarding-pass-demo.pdf` are resolved against the live VCR origin.
- Use only `reply` or `open_url` actions in live RCS content. `system_action`, lists, simulator-only cards, and call/location/calendar/custom action variants fail preflight.
- Keep RCS limits: text ≤ 3,000 UTF-8 characters; media URL ≤ 2,000 characters; file ≤ 100 MB; carousel 2–10 cards; reply chips ≤ 11; action chips/card buttons ≤ 4.

The Singapore Airlines scenario is the reference live-safe flow. Its boarding pass is a public PDF asset rather than a local simulator download/wallet action.
