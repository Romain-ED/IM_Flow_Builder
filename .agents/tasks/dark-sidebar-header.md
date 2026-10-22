# Dark sidebar + top header (v0.21.0)

## Files changed (this task)
- `src/utils/darkChrome.ts` (new): central dark-chrome class tokens (surfaces, focus ring, tinted/solid buttons, notices, field, segmented control).
- `src/components/layout/AppHeader.tsx`: slate-950 header, white title, indigo-200 version badge, dark nav pill with indigo-600 active tab, ghost buttons, Inspector (teal-700) / Presenter (violet-600) active states, `aria-pressed` on Inspector.
- `src/components/layout/Sidebar.tsx`: slate-900 surface, slate-800 dividers, dark scrollbar.
- `src/App.tsx`: desktop sidebar wrapper dark; `MobileOverlay` gets a `dark` prop used for the sidebar overlay.
- `src/components/common/SectionHeading.tsx`: optional `tone="dark"` (default unchanged, still used on light pages).
- `src/components/controls/{ScenarioControls,ChannelSelector,PhonePlatformSelector,DebugOptions,PlaybackControls,LiveRcsControls}.tsx`: restyled with tokens.
- `src/index.css`: `.thin-scrollbar-dark`.
- Version 0.20.0 -> 0.21.0: `package.json`, `package-lock.json` (root entries only), new `0.21.0` entry in `src/app/changelog.ts`. The 0.20.0 entry already covers the white RCS phone and Domino's SG branding, so 0.21.0 only mentions the dark sidebar/top bar. No other hardcoded 0.20.0 in src/server/README/CLAUDE.md/docs/tests (README/CLAUDE.md unchanged).

## Palette
Header slate-950, sidebar slate-900, borders/dividers slate-800, body text slate-100/300, labels slate-400 (~6.9:1 on slate-900), fields slate-800 + slate-600 border (color-scheme dark), toggle off-track slate-500, accent indigo (selected segments, active tab = indigo-600 + white text, ~6.3:1). Tinted buttons = `{color}-500/15` wash + `{color}-200` text + `{color}-400/40` border. Live RCS notices use the same tints (amber/rose/emerald-200 text). Solid teal uses teal-700 (white 5.4:1) instead of teal-600 (3.7:1). Focus ring: 2px indigo-300 outline, offset 2 (toggles via `peer-focus-visible`). Selected channel button: indigo-600 fill + accent dot (RCS purple / WhatsApp green) with white ring, so contrast is independent of the channel accent (WhatsApp green with white text would be ~3:1).

## Verification (real results)
- `npm test`: 21 files, 198 tests passed.
- `npm run lint`: 0 errors (2 pre-existing warnings: ChannelContext only-export-components, CustomScenarioEditorModal exhaustive-deps).
- `npm run build` (tsc -b && vite build): succeeded.

## Screenshots viewed (Playwright MCP, 1440x900, dev server :5199)
Simulator RCS/iPhone (dark sidebar+header, white phone); Simulator WhatsApp (selected state clear, phone untouched); Scenarios; Manual; Live logs; Simulator with Inspector open (Inspector button teal, panel unchanged and legible); keyboard focus ring on Presenter mode button; hover on Android segment. No light-on-light / dark-on-dark text spotted. Temp screenshots deleted; the browser state was reset to RCS / inspector closed.

## Not verified
- Live RCS amber/green/indigo session boxes with a ready server (dev server has no /api/live, so only the red "diagnostics unavailable" box was seen). The same tokens are used; the existing LiveRcsControls unit tests pass.
- Presenter mode and shared-link views were not opened (code untouched, they do not render the header/sidebar).
- Mobile (<lg) overlay with dark sidebar not screenshotted.
- Contrast ratios are computed from the Tailwind palette, not measured with a tool.
- Disabled buttons use opacity-40 (exempt from AA).
