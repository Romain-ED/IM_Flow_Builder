import { describe, expect, it } from 'vitest'
import { flowDefinitionSchema } from '../schema/flow'
import { parseFlowSource } from '../utils/flowSource'
import singaporeSource from './singapore-airlines.yaml?raw'
import { findRcsTriggerConflict, validateBuiltInRcsTriggers } from './triggerRegistry'

function flow(trigger: string, id = 'custom') {
  return flowDefinitionSchema.parse({
    version: '1.0',
    metadata: { id, name: id, channel: 'rcs', trigger },
    brand: { name: 'Test' },
    start: 'start',
    nodes: [{ id: 'start', messages: [{ type: 'text', text: 'Hi' }], end: true }],
  })
}

describe('RCS trigger registry', () => {
  it('accepts the built-in registry without duplicate triggers', () => {
    expect(validateBuiltInRcsTriggers()).toEqual([])
  })

  it('rejects collisions with built-ins and normalizes case and outer whitespace', () => {
    const parsed = parseFlowSource(singaporeSource, 'yaml')
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    const builtIn = flowDefinitionSchema.parse(parsed.data)
    expect(findRcsTriggerConflict(flow(`  ${builtIn.metadata.trigger!.toLowerCase()}  `), [], 'custom')).toMatchObject({
      id: 'singapore-airlines',
    })
  })

  it('rejects collisions between custom scenarios but permits the scenario being edited', () => {
    const scenarios = [{
      id: 'saved-one', name: 'Saved one', source: JSON.stringify(flow('UNIQUE')), format: 'json' as const,
      createdAt: 1, updatedAt: 1,
    }]
    expect(findRcsTriggerConflict(flow(' unique '), scenarios)?.id).toBe('saved-one')
    expect(findRcsTriggerConflict(flow(' unique ', 'saved-one'), scenarios, 'saved-one')).toBeNull()
  })

  it('does not reserve missing WhatsApp triggers', () => {
    const whatsapp = flowDefinitionSchema.parse({
      version: '1.0', metadata: { id: 'wa', name: 'WA', channel: 'whatsapp' }, brand: { name: 'Test' },
      start: 'start', nodes: [{ id: 'start', messages: [{ type: 'text', text: 'Hi' }], end: true }],
    })
    expect(findRcsTriggerConflict(whatsapp, [])).toBeNull()
  })
})
