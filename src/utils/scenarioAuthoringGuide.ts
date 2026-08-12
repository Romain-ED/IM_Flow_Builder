import guideText from '../../docs/SCENARIO_AUTHORING_GUIDE.md?raw'

/**
 * The canonical scenario-authoring spec, imported verbatim from
 * `docs/SCENARIO_AUTHORING_GUIDE.md` — same pattern `scenarios/index.ts`
 * already uses for the built-in YAML files (Vite's `?raw` suffix). This is
 * the single source of truth for both the "copy this prompt into any AI
 * tool" path and the in-app generator's system prompt, so the two can
 * never drift apart.
 */
export const SCENARIO_AUTHORING_GUIDE = guideText

/** The full prompt a user would paste into an external AI tool (ChatGPT, Claude.ai, etc). */
export function buildExternalPrompt(description: string): string {
  return `${SCENARIO_AUTHORING_GUIDE}\n\n---\n\nGenerate a scenario for: ${description.trim()}`
}
