# RCS white chrome, Domino's Singapore branding, original Domino's scenario removed

Date: 2026-10-14. Nothing committed.

## Part A: RCS phone chrome is white

Restyled only the RCS chrome. WhatsApp, sidebar and header nav are untouched (`theme.accent` was left alone because the sidebar channel selector reads it).

| Surface | Before | After |
| --- | --- | --- |
| Screen / chat background | lavender `#f7f2ff` | white (`channelThemes.rcs.screenBg`) |
| Header | lavender, purple shadow | white, `border-slate-200` divider, blue-grey hover `#f0f4f9`, blue `#0b57d0` focus ring, verified badge and "RCS" tag |
| Composer | lavender bar with a white bordered pill and a purple button | white bar, borderless `#f0f4f9` pill, dark-grey icons, light-green mic button (`#c4eed0` / `#0a5c2b`) as in Google's reference |
| Plain composer (input node) | purple ring and send button | `#0b57d0` |
| Business bubble / typing bubble | white with lavender border | `#f0f4f9`, no border |
| Sent bubble | purple | `#0b57d0`, white text |
| Chip background | translucent white | white, `#f0f4f9` on hover (outlined white chips as in the reference) |
| RCS business profile page | lavender | white with `slate` dividers and blue accents |

Rich-card panels stay `#f0f4f9`. They read clearly on the white screen.

Files: `src/channels/theme.ts` (new `chromeBg` and `chromeBorder`, set for both channels with WhatsApp values unchanged), `src/channels/rcs/RcsRenderer.tsx`, `src/channels/rcs/RcsHeader.tsx`, `src/components/phone/Composer.tsx`, `src/components/phone/RcsBusinessProfileView.tsx`, `src/index.css` (`.rcs-profile-action` colours).

I changed the sent bubble from purple to Google Messages blue and the profile-page accents to blue. This goes slightly beyond "lavender surfaces", but purple controls looked wrong on the neutral chrome. It is easy to revert in `theme.ts`.

## Part B: Domino's Singapore branding

Image sizes from `sips`: `imgi_17_app-icon.png` is 48x48 and `image-4.png` is 768x220 (3.5:1, "HAVE A SLICE DAY!" with a pizza and a Pepsi). `imgi_1_SG_21284_en_banner.jpg` (786x160) was not referenced by the YAML.

- `brand.avatar` is now `/assets/dominos-singapore-rcs-demo/imgi_17_app-icon.png`. This is the same absolute-path convention the scenario already used.
- **Banner decision:** `image-4.png` is used in two places.
  - `brand.banner` is a real schema field, shown on the RCS business profile page. The profile banner now shows the image as-is. Without a supplied banner it still shows the green default with its text overlay. With one, the placeholder "Romain / RCS Agent Demo" overlay and the dark scrim are skipped so they don't sit on top of the artwork.
  - The `heroImage` variable now points to `image-4.png`. It is the image of the first `welcome` rich card, which replaces `welcome.jpeg`. `mediaHeight` went from `tall` to `short`. A 3.5:1 banner in a tall (264 DP) slot would be hugely cropped, and short (112 DP) is the closest ratio.
- Crop check: in the short slot the left text and the pizza are visible, and only the right edge of the pizza is cut. In the profile banner (about 360x144) the left of the "S" in "SLICE" is slightly clipped.
- Both files exist and use `.png`, which the RCS validator accepts. SVG is the type it rejects, so the old `download.svg` avatar is gone from the scenario. `rcsCompliance.test.ts` passes.
- `welcome.jpeg` and `download.svg` are now unreferenced but I did not delete them (you said not to delete anything else).

## Part C: Original Domino's scenario removed

- Deleted `src/scenarios/dominos-rcs-video-campaign.yaml`. Removed its import and entry from `src/scenarios/index.ts`.
- Grep over `src/`, `server/`, `docs/`, `README.md`, `CLAUDE.md`, `public/` and `vcr.yml` found no other references. The compliance and scenario tests build their lists from `BUILT_IN_SCENARIOS`, so none needed editing.
- Deleted `public/assets/dominos-rcs-video-campaign/`. Nothing else referenced any file in it, including the Singapore scenario.
- **Persisted state:** the last scenario is stored as full source, not as an id. That would have kept loading the removed flow with broken images. I added `REMOVED_SCENARIO_IDS` in `src/scenarios/index.ts`, and the store init in `src/store/simulatorStore.ts` skips a stored flow whose `metadata.id` is in that list. It falls back to the default scenario.
- I verified this in the browser by writing an old-id flow into `localStorage['bmfs.lastScenario.v1']` and reloading. The app loaded the default Singapore Airlines scenario and the old flow was overwritten.
- Versioning per CLAUDE.md: bumped to 0.20.0 in `package.json` and `package-lock.json`, and added a `CHANGELOG` entry in `src/app/changelog.ts`.
- A user who copied the old scenario into My scenarios (a custom scenario) keeps their copy, but its images are gone.

## Verification

- `npm test`: 21 files, 198 tests passed. The count was 203; the 5 fewer are per-scenario tests for the removed scenario.
- `npm run lint`: 0 errors. The only 2 warnings are in `ChannelContext.tsx` and `CustomScenarioEditorModal.tsx`, which I did not touch.
- `npm run build` (`tsc -b && vite build`): succeeded. The only message is the usual chunk-size warning.
- Screenshots viewed (Playwright MCP against http://localhost:5199, kept in the MCP temp dir, nothing left in the repo; the downloaded Google reference images in `/tmp/rcs-ref` were deleted):
  1. iPhone RCS, welcome card: white chrome, Domino's icon avatar, `image-4.png` as the card image, buttons on the `#f0f4f9` panel, green mic pill.
  2. Android RCS, Today's Deals carousel: white chrome, blue sent bubble, tinted cards with the next card peeking, outlined "Main Menu" chip. The Android status bar (`#f8fafc`) against the white header shows no visible seam.
  3. RCS business profile page: banner, avatar and white page.
  4. WhatsApp (Android): green header, beige background, stacked bordered action rows, all unchanged.
  5. The scenario dropdown lists 7 scenarios, with exactly one Domino's: "Domino's Pizza Singapore — RCS Demo Flow".
- The first screenshot showed a black border around the composer pill. I removed the leftover `border` class and re-checked: computed border width is 0px.
- Not verified: dark-mode, other screen sizes and Compare mode. I only used the single phone view.
