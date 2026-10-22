# RCS compliance test

Date: 2026-10-13

## Test

`src/scenarios/rcsCompliance.test.ts` (new, 11 tests).

- Picks every built-in scenario whose channel is `rcs` or unset: `singapore-airlines`, `dominos-rcs-video-campaign`, `dominos-singapore-rcs-demo`. There is no channel-agnostic built-in today, but the filter would include one.
- Runs each through `validateFlowWithChannelCompliance` with `metadata.channel` forced to `rcs`, so channel-agnostic flows are judged as RCS too.
- Interpolates variables the way the renderer does, then asserts per message:
  - the type is in `rcsCapabilities.supportedMessageTypes` (no unsupported-type fallback);
  - `getCapabilityWarning(rcsCapabilities, message)` returns null;
  - an independent checker finds no violation of: text 3072, title 200, description 2000, label 25, rich-card suggestions 4, chips 11 (including node-level `actions`), carousel 2-10 cards, 4 suggestions per carousel card.
- Failure messages are shaped like `scenario / node "id" / message #n (type): rule "..."`.
- `OFFICIAL_RCS_LIMITS` is a separate table of Google's numbers. A test compares it with `rcsCapabilities` (and `maxListRows` 0 / no `list` support).
- Two self-tests prove the checker flags a 201-character title, a one-card carousel and a five-suggestion card.

## Result

- All three RCS scenarios passed with no YAML changes.
- All `rcsCapabilities` constants matched the official table, so no constant fixes were needed.
- I also made the test fail on purpose by temporarily setting title max to 30 and label max to 12. It failed with messages naming scenario, node and rule, and also failed the cross-check. I then restored `capabilities.ts`.

## Official page re-check and `docs/RCS_SPEC_REFERENCE.md`

The rich-cards guide, `agentMessages` REST reference and release notes confirm all current limits. The doc was updated with:

- horizontal layout (128 DP media, left or right; carousels vertical only);
- carousel width, max height, truncation and full-screen view, plus the 180/296 versus 120/232 DP conflict between Google's pages;
- persistent suggestions (May 2026);
- the emoji character-count caveat;
- a visual reference section and a "Changes found" list.

Not re-verified: the 100 MB media recommendation, the 2,048-character postback limit and the formats list on the Send page (text could not be matched). The dedicated Suggestions guide URL returned a generic page, so suggestion limits came from the other three sources.

## Verification

- `npm test`: 21 test files, 203 tests passed (includes the 11 new tests).
- `npm run lint`: 0 errors, 2 existing warnings in untouched files.
- `npm run build` (`tsc -b && vite build`): succeeded.
