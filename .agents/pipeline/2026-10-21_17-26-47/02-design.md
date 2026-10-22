# Technical Design: V Bank RCS Multifinance Journey

## Overview

Add one built-in, authored-channel RCS YAML scenario titled **“V Bank: From just curious to first repayment.”** It uses the existing TypeScript/React/Vite simulator, YAML `?raw` imports, Zod flow validation, the declarative `ConversationEngine`, authored-channel RCS compliance checks, and Live RCS preflight. The scenario is a deterministic fictional Indonesian FSI/multifinance demo for Nadia: discovery carousel → indicative qualification → secure browser handoffs → fictional approval/signing/disbursement → first repayment. Browser actions never mutate state; an explicit reply models returning from the external page.

Only official project primitives are used: `text`, `rich_card`, `carousel`, `suggested_replies`, and `reply`/`open_url` actions. There is no native form, document picker, camera/liveness UI, signature widget, payment request, list, OTP, or other simulator-only UI. No dependency, server behavior, deployment setting, or new asset is added.

## Files, registry, and reused assets

Create `src/scenarios/vbank-multifinance.yaml`. Modify `src/scenarios/index.ts` to import it with `?raw` and append this exact registry entry:

- `id`: `vbank-multifinance-first-repayment`
- `name`: `V Bank: From just curious to first repayment`
- `description`: `Discovery → indicative eligibility → fictional multifinance application → first repayment.`

The YAML must use the same exact `metadata.id`, with `metadata.channel: rcs`, a kebab-case ID, and tags `[fsi, multifinance, lending, rcs, demo, fictional]`. `BUILT_IN_SCENARIOS` is the discovery/load registry used by `loadBuiltInScenario`; no separate registration mechanism is needed. Add `src/scenarios/vbank-multifinance.test.ts` for focused graph and journey coverage rather than changing unrelated scenario tests.

Reuse these existing public PNGs, with no copying, downloading, renaming, or generation:

- `/assets/singapore-airlines/aircraft-a350.png` — Personal Loan placeholder
- `/assets/singapore-airlines/seat-window.png` — Car Loan placeholder
- `/assets/singapore-airlines/seat-legroom.png` — Home Mortgage placeholder

The repository contains all three under `public/assets/singapore-airlines/`, and PNG is accepted by RCS preflight. The YAML may comment that these are temporary unrelated placeholders; the welcome disclosure must visibly say all artwork is placeholder/demo material. Do not use the Singapore Airlines brand avatar as V Bank artwork. Use fictional sender metadata only: `brand.name: "V Bank (Demo)"`, `shortName: "V Bank Demo"`, `verified: true`, and `description: "Illustrative RCS demo · not a real lender"`; omit avatar, website, phone, email, and `rcsProfile`. `verified` is simulator presentation only. “OJK Supervised” may appear only in copy saying it is fictional text in placeholder artwork, not a real certification or regulatory claim.

## State and URL policy

Declare only flat scalar variables under `variables`, including:

- customer/product: `customerName: Nadia`, `selectedProduct: "none"`, `productRate: ""`, `productDescription: ""`;
- qualification: `consentGiven: false`, `incomeBand: "unset"`, `employmentStatus: "unset"`, `existingRepayments: "unset"`;
- application: `indicativeLimit: "Rp 150,000,000"`, `selectedAmount: "Not selected"`, `termMonths: 0`, `estimatedInstallment: "Not calculated"`, `amountTermStatus: "not_selected"`, `ktpReceived: false`, `payslipReceived: false`, `documentsStatus: "0 of 2"`, `identityStatus: "pending"`, `contractStatus: "pending"`, `disbursementStatus: "pending"`;
- servicing: `paymentMethod: "none"`, `paymentStatus: "unpaid"`, `virtualAccount: "8800 2611 0108 42"`.

Suggested-reply/card-reply choices are the only inputs. Each qualification choice stores a predefined enum-like value; no free-form income, identity, document, account, or payment data is accepted. Node `set` values update deterministic display progress, and later copy reads those variables. No real PII is stored.

Use fixed absolute HTTPS `.example` URLs with no query string, token, secret, or customer data:

- `https://demo.vbank.example/apply/amount-term`
- `https://demo.vbank.example/secure-upload/ktp`
- `https://demo.vbank.example/secure-upload/payslip`
- `https://demo.vbank.example/secure-identity/liveness`
- `https://demo.vbank.example/secure-contract/review-sign/VB-PL-261101-0842`
- `https://demo.vbank.example/contract/VB-PL-261101-0842`
- `https://demo.vbank.example/repayment-schedule/VB-PL-261101-0842`
- `https://demo.vbank.example/receipt/VB-PL-261101-0842`

The Zod `actionSchema` currently validates an `open_url.url` only as a string; it does **not** own HTTPS validation. `preflightLiveRcsFlow` owns action URL transport validation and must be run in focused tests with `publicBaseUrl: "https://demo.example"`. Brand/profile URLs are separately schema-validated, but this scenario has none. Open-URL actions intentionally have no `next` or `set` because the action schema does not support them; only the subsequent reply changes state.

## Node graph and concrete interactions

Every node has an explicit `next`, `end`, condition, node-level choice bar, or inline interactive message. All card actions are typed `reply` or `open_url`; every standalone suggestion message immediately follows a body `text` or card/media message. Labels stay within the RCS 25-character limit; carousels have 2–10 cards, exactly three here; cards have at most four actions; standalone groups have at most 11 chips.

**Discovery.** `start: welcome`. `welcome` sends a short disclosure covering fictional rates/amounts/dates/sender identity and stating that “OJK Supervised” is only fictional wording in placeholder artwork. It then sends exactly one three-card carousel:

- Personal Loan: `/assets/singapore-airlines/aircraft-a350.png`, “From 12% p.a.”, description and rate-basis/terms disclaimer. `Check eligibility` sets `selectedProduct: personal_loan`, `productRate: "From 12% p.a."`, and product description, then goes to `consent`; `View details` goes to `details_personal`.
- Car Loan: `/assets/singapore-airlines/seat-window.png`, “From 6% p.a.”, same illustrative disclosure; actions target `details_car` or set car state and go to `consent`.
- Home Mortgage: `/assets/singapore-airlines/seat-legroom.png`, “Intro rate from 5% p.a.”, same disclosure; actions target `details_home` or set home state and go to `consent`.

`details_personal`, `details_car`, and `details_home` each use a rich card with product-specific fictional copy, the rate-basis/illustrative disclosure, `Check eligibility` to `consent` with the product state set, and `Back to options` to `welcome`. This gives every carousel action a concrete route.

**Consent and qualification.** `consent` explains that answers and existing V Bank account information are used only for an initial indicative assessment, do not commit the user, and are not approval or a real credit decision. `Agree & continue` sets `consentGiven: true` and goes to `income_question`; `Not now` goes to `not_now`. `not_now` offers `Browse options → welcome`, `End demo → cancelled`, and no data collection. Global whole-word triggers route `help` to `help` and `cancel`/`stop` to `cancelled` from any free-text send.

`income_question`, `employment_question`, and `repayment_question` each send a text prompt followed by exactly three `suggested_replies`. Values are respectively `incomeBand: under_10m | 10_to_20m | over_20m`, `employmentStatus: permanent | contract | self_employed`, and `existingRepayments: none | under_3m | 3m_or_more`; every choice has a valid next target. The third question routes to `eligibility_result`.

**Indicative result and amount/term handoff.** `eligibility_result` shows a rich card with “Indicative eligibility: up to Rp 150,000,000,” the chosen product/rate, and a prominent disclosure that this is initial eligibility only, the demo performs no credit assessment, and final approval requires documents and credit checks. Its actions are:

- `Choose amount & term` → `open_url` amount URL;
- `I’ve chosen` → set `selectedAmount: "Rp 60,000,000"`, `termMonths: 24`, `estimatedInstallment: "Rp 2,824,408"`, `amountTermStatus: "selected"`, then `documents_ktp`;
- `Not now` → `not_now`.

The copy says to use `I’ve chosen` only after returning from the secure placeholder page. The URL click itself is not treated as completion and has no state effect.

**Documents with fixed pause/resume targets.** `documents_ktp` sets `documentsStatus: "0 of 2"` and shows KTP pending plus latest payslip pending. Its four card actions are `Upload KTP` (open URL), `KTP uploaded` (set `ktpReceived: true`, go to `documents_payslip`), `Later` → `pause_ktp`, and `Help` → `help`. `documents_payslip` sets `documentsStatus: "1 of 2"`, shows KTP received/payslip pending, and has `Upload payslip`, `Payslip uploaded` (set `payslipReceived: true`, go to `documents_complete`), `Later` → `pause_payslip`, and `Help` → `help`. `documents_complete` sets `documentsStatus: "2 of 2"`, shows both received, and has `Start identity check` → `identity_intro`, `Later` → `pause_documents_complete`, and `Help` → `help`.

The stage-specific pause nodes eliminate unsupported dynamic return behavior: `pause_ktp` has `Resume application → documents_ktp`, `Browse options → welcome`, `End demo → cancelled`; `pause_payslip` resumes to `documents_payslip` with the same other targets; `pause_documents_complete` resumes to `documents_complete`; each says no real document was submitted. There is no generic pause node.

**Identity.** `identity_intro` explains that liveness is represented only by a secure browser handoff and this simulator does not verify identity. Its card actions are `Open secure check` (open URL), `Identity complete` (set `identityStatus: "verified"`, go to `approval_card`), `Couldn’t complete` (set `identityStatus: "failed"`, go to `identity_retry`), and `Help` → `help`. `identity_retry` repeats the fixed URL and offers `Try again` (set status back to `pending`, go to `identity_intro`), `Stop` → `pause_identity`, and `Help` → `help`. `pause_identity` has fixed `Resume → identity_intro`, `Browse options → welcome`, and `End demo → cancelled`. Approval is reachable only via the explicit positive return reply.

**Approval, signing, and disbursement.** `approval_card` contains fictional final illustrative values: principal `Rp 60,000,000`, final illustrative rate `12% p.a.`, monthly instalment `Rp 2,824,408`, fees `Rp 1,200,000`, total instalments `Rp 67,785,792` (24 × instalment), and **total cost including fees `Rp 68,985,792`**, reference `VB-PL-261101-0842`. The card explicitly distinguishes this from initial eligibility, says fees are shown separately and included only in total cost, and states it is not a real offer or lending decision. Actions: `Review & sign` (open contract URL), `Contract signed` (set `contractStatus: "signed"`, go to `disbursement`), `Couldn’t sign` (set `contractStatus: "failed"`, go to `contract_retry`), and `Help` → `help`.

`contract_retry` repeats the review URL and offers `Try again` (set `contractStatus: "pending"`, return to `approval_card`), `Contract signed` (set signed and go to `disbursement`), `Not now` → `pause_contract`, and `Help` → `help`. `pause_contract` has fixed `Resume → approval_card`, `Browse options → welcome`, and `End demo → cancelled`; it cannot accidentally resume at a document or identity stage. `disbursement` sets `disbursementStatus: "confirmed"`, sends text and a rich card confirming that signing and transfer into the fictional V Bank account are demo events only, and offers `View contract` and `Repayment schedule` open URLs. It then auto-transitions to `repayment_reminder`; no real contract, account, or transfer exists.

**Servicing and payment.** `repayment_reminder` shows a rich card with fictional amount `Rp 2,824,408`, due date `6 December 2026`, and an illustrative-only disclosure. A following suggested-replies message offers `BCA`, `Mandiri`, `BRI`, `Alfamart`, `Pay later`, and `Help`; each bank sets `paymentMethod` and goes to `payment_instructions`, `Pay later` goes to `payment_later`, and `Help` goes to `help`.

`payment_instructions` displays the selected method, fixed fictional virtual account, exact amount/due date, and method-specific instructions. It says no real payment is initiated. Its card actions are `I’ve Already Paid` (set `paymentStatus: "checking"`, go to `payment_checking`), `Pay later` → `payment_later`, and `Help` → `help`. `payment_checking` says this demo is only representing a check and sends replies `Payment confirmed` (set `paymentStatus: "received"`, go to `payment_received`), `Not yet` (set `paymentStatus: "unpaid"`, go to `payment_later`), and `Need help` → `help`. This models `unpaid → checking → received` without pretending to query a bank.

`payment_received` sends a rich card “Payment received · Rp 2,824,408” with fictional/demo disclosure, `View receipt` open URL, and `Done → complete`. `payment_later` states payment remains unpaid and offers `Resume payment → repayment_reminder`, `Browse options → welcome`, and `End demo → cancelled`. `help` explains the journey is illustrative, no real data/payment is handled, and offers `Back to options → welcome` and `End demo → cancelled`. `complete` and `cancelled` are deliberate terminal nodes.

The primary path is `welcome → consent → income_question → employment_question → repayment_question → eligibility_result → documents_ktp → documents_payslip → documents_complete → identity_intro → approval_card → disbursement → repayment_reminder → payment_instructions → payment_checking → payment_received → complete`, with each external handoff completed by its explicit reply action.

## Failure handling, validation ownership, and testability

YAML parse/schema errors, duplicate or dangling targets, dead-end nodes, unsupported message types, suggestion attachment violations, RCS limits, invalid media paths/extensions, and malformed graph state are fatal through the existing parser/validator or Live RCS preflight and must be reported rather than hidden. `open_url` handoffs are recoverable: a local/Live click produces only the existing external-action behavior; retry, stage-specific Later, or Help remains available. State does not advance on URL click. Unknown live reply correlations remain unmatched under existing server behavior and do not mutate session state. No change to `server/liveDemo.js` is required; Live RCS deployment allowlisting remains an operator configuration concern using the exact metadata ID.

Add focused tests in `src/scenarios/vbank-multifinance.test.ts` that:

1. parse the registered source using `parseFlowSource`, validate it with `validateFlowWithChannelCompliance`, assert registry ID/name equals the exact values above, assert `metadata.id` equals the registry ID, matches `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, is unique among built-ins, and assert `metadata.channel: rcs`;
2. inspect the welcome carousel for exactly the three product titles and exact reused image paths, and verify every `next`, condition target, trigger target, and reply/card action target resolves to a node;
3. run `preflightLiveRcsFlow(flow, { publicBaseUrl: "https://demo.example" })`, assert success, and inspect the compiled actions to ensure all handoff URLs are HTTPS and resolved; this is the test that owns action URL transport validation because `actionSchema` does not refine action URLs;
4. exercise the main journey using parsed nodes and real `resolveChoice`/`resolveAction` outputs or `computeNodePlan`, asserting all three qualification variables, selected amount/term, document status `0 of 2 → 1 of 2 → 2 of 2`, verified identity, signed contract, confirmed disbursement, payment `unpaid → checking → received`, final amount/reference, and receipt URL;
5. cover alternate reachable paths: each product details/back route, consent refusal, all three stage-specific document pause/resume routes, identity failure/retry/pause, contract failure/retry/pause, payment Not yet/pay later, Help, and cancel/stop triggers.

The existing generic scenario, RCS capability, and Live preflight suites remain unchanged and provide additional coverage. Validation commands after implementation are `npm test -- --run`, `npm run lint`, and `npm run build`; perform a targeted simulator/DOM smoke check that loads `vbank-multifinance-first-repayment`, confirms it appears in scenario discovery, and advances the primary path through the receipt action. Report exact command results and the three reused paths. Do not commit or push.

## Responses to the design review findings

1. **HIGH — generic pause could not resume its originating stage:** addressed by replacing it with `pause_ktp`, `pause_payslip`, `pause_documents_complete`, `pause_identity`, and `pause_contract`, each with a fixed, explicitly named Resume target. The design requires tests for every Later/Stop/Not now and Resume route.
2. **MEDIUM — navigation targets were underspecified:** addressed with concrete targets for every Back, Browse options, Help, Stop, Not now, Later, Resume, and End demo action throughout the graph; all targets are included in the dangling-reference test.
3. **MEDIUM — approval repayment values were ambiguous:** addressed by labeling `Rp 67,785,792` as total instalments and adding fee-inclusive total cost `Rp 68,985,792`, with the fictional calculation basis and separate fee disclosure on the approval card.
4. **MEDIUM — metadata ID was vague:** addressed with the exact shared ID `vbank-multifinance-first-repayment`, plus exact-equality, kebab-case, and uniqueness assertions.
5. **MEDIUM — action URL schema-validation claim was incorrect:** addressed by assigning HTTPS/app-relative action URL validation to `preflightLiveRcsFlow`, requiring focused preflight assertions, and explicitly not changing the global action schema because the request is scoped to this scenario.

## Out of scope

Real lending, credit scoring, regulatory verification, KYC/liveness, document storage, contract execution, authentication, disbursement, banking integrations, payment processing, receipt generation, external endpoint implementation, real PII, new artwork/assets, dependencies, provider configuration, `server/liveDemo.js` changes, deployment changes, and git commit/push.
