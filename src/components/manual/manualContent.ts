import content from './manualContent.json'

type ParamRows = [string, string][]

/** Table-shaped Manual content lives in manualContent.json so it can be edited without touching JSX. */
export const MANUAL = content as unknown as {
  toc: { id: string; label: string }[]
  platformLimits: [string, string, string][]
  architectureLayers: { label: string; accent: string }[]
  interfaceGuide: ParamRows
  nodeFields: ParamRows
  messageTypes: ParamRows
  aiAuthoring: ParamRows
  architectureFiles: ParamRows
}
