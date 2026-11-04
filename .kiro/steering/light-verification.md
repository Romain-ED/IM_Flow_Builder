---
inclusion: always
---

# Light verification and review

Match checks to the size of the change. This overrides the "every change" checklist in `CLAUDE.md` for Kiro sessions and workflow agents. Run the full checklist (`npx tsc -b && npm run build && npm test && npx oxlint .`) only before a release, a deploy, or when the user asks.

## Checks by change type

- Copy, styling, docs, changelog, version bump: no tests. Run `npx tsc -b` only if a `.ts`/`.tsx` file changed. No review.
- Bug fix or small change in known files: run only the test file(s) next to the changed code (`npx vitest run <path>`), plus `npx tsc -b`. No review step, no build, no lint.
- Medium feature in a known area: run the affected test files, `npx tsc -b`, and `npx oxlint <changed files>`. One review pass. Skip a second review unless the first found a real bug.
- Changes to `server/liveDemo.ts`, webhook, auth, or allowlist code: run the full `npm test` and one review, because production Live RCS depends on it.
- New architecture or work across several subsystems: full checklist and review loop (at most 2 iterations).

## Rules

- Run `npm run build` only when changing `vite.config.ts`, `build.sh`, `vcr.yml`, dependencies, or before deploy.
- Run the full `npm test` at most once per task, at the end, and only for medium or larger changes.
- Do not rerun a check that already passed unless files changed after it.
- Playwright visual pass: only for a visibly new or restructured UI, one screenshot of the affected element. Skip it for color, copy, or spacing tweaks.
- Reviewers read the diff (`git diff`) and the verification note. They do not rerun tests, build, or lint.
- Report only failures and what was run, in a few lines. No verification report files for small changes.
- Review findings block only for bugs, security, or broken requirements. Style and naming remarks are not blockers.
