# Design Review: V Bank RCS Multifinance Journey

## Findings

1. **MEDIUM — Non-personal product eligibility reaches a personal-loan approval flow.** The “Discovery” section says Car Loan and Home Mortgage `Check eligibility` actions set `selectedProduct` to those products and route to the shared `consent`/qualification path, while “Approval, signing, and disbursement” hard-codes the principal, `12% p.a.`, repayment values, and reference `VB-PL-261101-0842` as a personal-loan result. This conflicts with the requirement that selected product be reflected in later messages and leaves a reachable path that can present a personal-loan approval after selecting another product. Fix one behavior explicitly: either route non-personal `Check eligibility` actions to product-specific detail/not-available nodes and state that only Personal Loan enters qualification, or add product-specific result/approval/application values and conditional targets (including product-specific reference IDs and disclosures) through disbursement and servicing. Add an alternate-path test for Car Loan and Home Mortgage to prove the chosen behavior.

## Verified Assumptions

- `BUILT_IN_SCENARIOS` in `src/scenarios/index.ts` is the registry consumed by `loadBuiltInScenario` in `src/store/simulatorStore.ts`; adding the import and entry is sufficient for dropdown discovery and ID-based loading.
- The flow schema supports flat scalar variables, node/action `set`, `next`, conditions, reply actions, and `open_url` actions. `src/schema/messages.ts` confirms `open_url` intentionally has no `next` or `set` fields, while reply actions do.
- `resolveAction` in `src/engine/ConversationEngine.ts` treats `open_url` as an external action without navigation, and `resolveChoice`/reply actions propagate `next` and `set`, matching the proposed browser-handoff/return pattern.
- RCS capabilities in `src/channels/rcs/capabilities.ts` and `src/channels/rcs/normalize.ts` enforce 2–10 carousel cards, four card-owned actions, 11 standalone suggestions, and 25-character labels. The proposed three-card carousel and stated action counts fit those limits.
- `preflightLiveRcsFlow` in `src/live/rcsPreflight.ts` validates absolute HTTPS action URLs, resolves relative media URLs against `publicBaseUrl`, checks RCS media extensions, and compiles reply/open-url actions. The proposed absolute HTTPS `.example` handoff URLs are compatible with this implementation.
- Live RCS runtime support for the proposed primitives is present in `server/liveDemo.js`: it creates reply/open-url actions, correlates reply IDs, ignores unmatched inbound postbacks without routing them, and supports node `next` transitions. No server change is inherently required by the described primitives.
- The three proposed placeholder files exist under `public/assets/singapore-airlines/`: `aircraft-a350.png`, `seat-window.png`, and `seat-legroom.png`.
- The proposed test imports and validation approach matches existing tests: `parseFlowSource`, `validateFlowWithChannelCompliance`, `flowDefinitionSchema`, `computeNodePlan`/interaction resolvers, and `preflightLiveRcsFlow` are all present and usable.

## Unverified/Wrong Assumptions

- The design’s product-independent qualification/approval claim is wrong as written: it has not defined conditional product behavior, yet routes Car Loan and Home Mortgage eligibility into a flow whose later values and reference are explicitly personal-loan values. This must be resolved before implementation as described in Finding 1.
- The actual YAML has not been authored yet, so exact node-reference resolution, rendered message lengths, disclosure placement, and the promised DOM journey remain implementation-dependent. The focused graph, compliance, preflight, and alternate-route tests specified by the design are required to verify them.

**Verdict: CHANGES_REQUESTED**
