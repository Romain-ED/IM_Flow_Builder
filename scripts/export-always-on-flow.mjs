// Exports the RCS MENU flow and its selectable RCS scenarios to
// server/generated/always-on-rcs-menu.json ({ flow, catalog }) so the VCR server can run
// the always-on menu without a hand-made file or secret. Uses the same parsing and schema
// validation as the Live RCS panel (LiveRcsControls) via Vite's SSR loader.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = resolve(root, 'server', 'generated', 'always-on-rcs-menu.json')
const MENU_ID = 'rcs-demo-menu'

const vite = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
  plugins: [],
})

try {
  const { BUILT_IN_SCENARIOS } = await vite.ssrLoadModule('/src/scenarios/index.ts')
  const { flowDefinitionSchema } = await vite.ssrLoadModule('/src/schema/flow.ts')
  const { parseFlowSource } = await vite.ssrLoadModule('/src/utils/flowSource.ts')

  const parse = (scenario) => {
    const parsed = parseFlowSource(scenario.source, 'yaml')
    if (!parsed.success) throw new Error(`Scenario "${scenario.id}" failed to parse: ${parsed.message}`)
    const result = flowDefinitionSchema.safeParse(parsed.data)
    if (!result.success) throw new Error(`Scenario "${scenario.id}" failed schema validation: ${result.error.message}`)
    return result.data
  }

  const menuScenario = BUILT_IN_SCENARIOS.find((scenario) => scenario.id === MENU_ID)
  if (!menuScenario) throw new Error(`Built-in scenario "${MENU_ID}" not found.`)
  const flow = parse(menuScenario)
  const catalog = BUILT_IN_SCENARIOS
    .filter((scenario) => scenario.id !== MENU_ID)
    .flatMap((scenario) => {
      const data = parse(scenario)
      return data.metadata.channel === 'rcs' ? [{ id: scenario.id, flow: data }] : []
    })

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, `${JSON.stringify({ flow, catalog })}\n`)
  console.log(`Wrote ${outFile} (menu + ${catalog.length} RCS scenarios).`)
} finally {
  await vite.close()
}
