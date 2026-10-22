# RCS UI audit against Google's rich-card references

Date: 2026-10-13

## Method

- Downloaded the 10 reference PNGs (`rich-card-components`, `vertical-rich-card`, `horizontal-rich-card`, `rich-card-heights`, `rich-card-carousel`, `carousel-with-suggestions`, `suggested-replies`, `suggested-actions-versions`, `pdf-file-preview`, `default-pdf-icon`) and viewed each one.
- Ran the real app with the Vite dev server and took headless Chrome screenshots at 520x1500. I loaded a throwaway flow through the app's own share-link hash (`#flow=r.<base64>&platform=android`), so the shipped components rendered the cards, not a mock harness.
- The flow contained a rich card with 3 actions, a horizontal card, a PDF document, a 3-card carousel, and chip lists. A second flow showed short, medium and tall media. A third showed the same content on WhatsApp.
- Compared each screenshot with the matching reference, fixed the RCS renderers, and re-screenshotted.

## Divergences found and fixed (RCS only)

| Area | Before | Reference | Fix |
| --- | --- | --- | --- |
| Card body | White card with grey border and shadow | Tinted panel (`#f0f4f9`), no border | `MessageShell` got an opt-in `tinted` prop, used by RCS rich card and file cards |
| Card action rows | Flat rows divided by lines, purple text | Stacked full-width white rounded rows with a small gap; outer corners rounder | `RCS_ACTION_STACK` in `src/channels/rcs/cardStyles.ts`, used by rich card and carousel |
| Row icons | Purple external-link icon for URL, arrow for reply | Grey circular globe for open-URL, phone/pin for dial/location, no icon for plain replies | `ActionButton`: globe for RCS open-URL, no icon for RCS replies |
| Text colour | Purple labels | Dark text | RCS chip/label colours in `theme.ts` |
| Chips | Purple outline, arrow icon on every reply | Grey outlined pill, no icon on replies, blue icon on URL/call chips | `ChoiceChips`, `ActionButton` chip variant, `theme.ts` |
| Media heights | Tall 256, medium 176, carousel 128 px | Short 112, medium 168, tall 264 DP; carousel cards 112 | Exact `h-[112px]`, `h-[168px]`, `h-[264px]` |
| Card width | Shrink-wrapped to media and title, so three cards had three widths | One consistent card width | Tinted RCS cards use a fixed 86% width |
| Carousel | White bordered cards, 260px wide, 56px peek | Tinted cards, Medium width 296 DP, next card peeking | Tinted cards, width `min(100% - 40px, 296px)` |
| Horizontal layout | `orientation: horizontal` ignored | Media on the side, fixed 128 DP wide | Implemented for standalone RCS rich cards (media left; the schema has no alignment field) |
| File / PDF | WhatsApp-style row | Grey preview area, red PDF badge with file name, title and description on the tint | RCS variant in `DocumentMessage` |

## Verified in screenshots

- Short, medium and tall media measured 112, 168 and 264 px in the screenshot, centre-cropped. The images are 675x450, and the crop is visible in the tall and short cards.
- All three standalone cards have the same width after the fix.
- The carousel shows the first card almost full width, the next card peeking, and chips below it, right-aligned.
- The WhatsApp screenshot is unchanged: green text, external-link icons, stacked bordered rows, white bordered cards.

## Left as is, and why

- The phone chrome keeps the app's lavender RCS theme (screen background, header, composer). Google Messages uses a neutral white/blue-grey theme. This is global chrome, outside the scope of cards, carousels, media and chips.
- Fonts are the app's sans-serif, not Google Sans.
- Text sizes are in px and look slightly smaller next to the references because the app scales the phone frame.
- The carousel has no full-screen text view (Google has one for truncated cards). The existing image viewer stays.
- Persistent versus transient suggestion behaviour is not modelled (no schema field).
- Carousel card width is not selectable (Small 180 or Medium 296 DP). Medium is used.
- The Google pages disagree on card widths: the rich-cards guide says 180/296 DP, the REST enum says 120/232 DP. I followed the guide.
- File preview shows no file size (not in the schema) and no first-page PDF preview.

## Files changed

`src/components/phone/{MessageShell,ActionButton,ChoiceChips}.tsx`, `src/channels/theme.ts`, `src/channels/rcs/cardStyles.ts` (new), `src/messages/{RichCard,Carousel,DocumentMessage}.tsx`.
WhatsApp paths are unchanged. There is no scenario-specific logic.

## Checks after the changes

- `npm test`: 21 files, 203 tests passed.
- `npm run lint`: 0 errors, 2 warnings in files this work did not touch (`ChannelContext.tsx`, `CustomScenarioEditorModal.tsx`).
- `npm run build` (`tsc -b && vite build`): succeeded.
