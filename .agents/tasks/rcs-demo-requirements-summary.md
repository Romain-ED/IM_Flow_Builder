# RCS demo findings

## Summary
Generic CSE request: reusable RCS simulator plus optional live run to one allowlisted test phone. App is opt-in; Vonage delivery not runtime-verified.

## Evidence
- JSON/YAML state machine, deterministic engine, RCS phone UI, editor and presenter/share/compare (`README.md`; `src/engine/`, `src/channels/`).
- Actors: fictional airline agent/customer. Journey: welcome → check-in/booking → seat → confirmation → boarding pass; branches cancel/back, alternate/upgrade seat, download/wallet/details/done (`src/scenarios/singapore-airlines.yaml`). Generalize demo data.
- Live: preflight → token/destination → server send → signed callbacks → polling; stop/restart (`docs/LIVE_RCS_DEMO.md`; `LiveRcsControls.tsx`; `server/liveDemo.js`).
- Vonage RCS, HTTPS webhooks, fake gateway; server-only credentials, allowlist, durable store. No CRM/AI/contact-center (`docs/LIVE_RCS_DEMO.md`).
- UI: Simulator, controls, Scenarios, Manual, Live logs; shared renderers/messages/Zustand (`src/components/`).
- Constraints/success: disabled default; public HTTPS media; reply/open_url; RCS limits; one recipient; ephemeral storage loses sessions. Success: validation, delivery, reply advances, status/timeline. Tests cover preflight/built-ins, not provider delivery (`docs/LIVE_RCS_DEMO.md`; `docs/RCS_SPEC_REFERENCE.md`).

## Conclusions/recommendations
TBD: TSA/TSE, opportunity, vertical, audience, brand, journey, recipient, agent, webhook, dates, effort, KPIs, approvals. Accept fake mode, then one Developer Mode recipient with durable storage/signed callbacks; no production until proven.