---
inclusion: always
---

# Token budget rules

Keep context small. These rules apply to the orchestrator and to every workflow agent.

## Pick the workflow weight by task size

- Small change in known files (copy, styling, one component, a bug with a known location): one `wf-coder` step, no design phase, no review loop. Use `agent://wf-coder`.
- Investigation only: `bundled://investigate`. The report must be short (about 1 KB, findings and file paths only).
- Medium feature in a known area: coder plus reviewer, at most 2 review iterations.
- Full design, design-review, plan, implement loop (`feature-pipeline` shape): only for new architecture, ambiguous requirements, or work spanning several subsystems.

## Model tiers per step (if the step accepts `modelId`)

- Strongest model: design authoring, design review, tricky debugging.
- Mid tier: normal feature implementation and code review.
- Small and fast tier: version bump, changelog entry, docs updates, running lint/build/tests, simple lookups.

## Reading discipline

- Do not read anything under `.agents/` unless the task names a specific file there. Those are finished run artifacts.
- Do not read `docs/HISTORY.md` unless the task is about the history of a specific feature.
- For large files (`src/store/simulatorStore.ts`, `server/liveDemo.js`, `src/app/changelog.ts`, `src/components/manual/ManualPage.tsx`), grep for the symbol first and read only that range. Never read them whole.
- Never read `package-lock.json`.
- Prefer targeted browser checks (one element, one computed style) over full-page snapshots or screenshots.

## Sessions

- One task per session. Start a new session when the task changes.
- Write workflow reports and findings in under 1 KB unless the task says otherwise.
