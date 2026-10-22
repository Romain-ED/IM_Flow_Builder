# V Bank content verification

## Files changed
- `src/scenarios/vbank-multifinance.yaml`, `src/scenarios/index.ts`, `src/scenarios/vbank-multifinance.test.ts`
- `public/assets/V Bank/{banner wide.jpg,banner.jpg,1.jpeg,1.jpg,2.jpeg,3.jpeg}`
- `src/channels/rcs/RcsHeader.tsx`, `src/channels/rcs/RcsHeader.test.tsx`
- `src/components/controls/LiveRcsControls.tsx`, `src/components/controls/LiveRcsControls.test.tsx`
- `server/liveDemo.js`, `server/liveDemo.test.js`, `vcr.yml`
- `.agents/tasks/v-bank-content-verification.md` (this record)

No generated `dist/` files were edited and no commit was made.

## Audit and corrections
- Removed V Bank demo/fictional/example/test signaling from scenario metadata, labels, sender/profile copy, messages, prompts, buttons, replies, fallback/support text, completion/cancellation states, handoff URLs, header fallback text, and changed V Bank asset artwork to production-style copy.
- V Bank’s rendered Live RCS controls now use neutral service/session wording; demo/test wording remains only in the non-V-Bank branch. Added a rendered assertion covering this path.
- Normalized client destinations server-side and restricted them to `LIVE_RCS_TEST_RECIPIENT` plus the optional server-only `LIVE_RCS_ALLOWED_RECIPIENTS` allowlist. Unauthorized numbers are rejected; status callbacks still resolve against the selected allowed recipient. Added authorization and normalization regressions.
- Re-audit found no prohibited whole-word markers in the authored V Bank YAML, RCS header/runtime path, or generated bundle’s V Bank content. V Bank flow tests cover registration, parsing, branches, values, timing, HTTPS handoffs, and Live RCS preflight.

## Validation
- `npx tsc -b` — passed.
- `npm run build` — passed; existing large-chunk warning only.
- `npm test` — passed: 26 files / 249 tests.
- `npx oxlint .` — passed; two known warnings in `ChannelContext.tsx` and `CustomScenarioEditorModal.tsx`.
