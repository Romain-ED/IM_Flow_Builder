import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useSimulatorStore } from './simulatorStore'

const flowSource = (channel: 'rcs' | 'whatsapp', trigger?: string) => JSON.stringify({
  version: '1.0',
  metadata: { id: `test-${channel}`, name: 'Test flow', channel, ...(trigger === undefined ? {} : { trigger }) },
  brand: { name: 'Test' },
  start: 'welcome',
  nodes: [{ id: 'welcome', messages: [{ type: 'text', text: 'Welcome' }], end: true }],
})

async function settle() {
  await vi.waitFor(() => expect(useSimulatorStore.getState().isPlaying).toBe(false))
}

describe('simulator RCS entry triggers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useSimulatorStore.setState({
      liveSessionActive: false,
      customScenarios: [],
      currentNodeId: null,
      history: [],
      events: [],
      fastMode: true,
    })
  })

  it('waits for exact normalized entry text before starting an RCS flow', async () => {
    const flow = JSON.parse(flowSource('rcs', 'START DEMO'))
    expect(useSimulatorStore.getState().loadScenarioSource(flowSource('rcs', 'START DEMO'), 'json')).toBe(true)
    expect(useSimulatorStore.getState().currentNodeId).toBeNull()
    expect(useSimulatorStore.getState().history).toHaveLength(0)

    useSimulatorStore.getState().handleFreeText('START DEMO now')
    expect(useSimulatorStore.getState().currentNodeId).toBeNull()
    expect(useSimulatorStore.getState().history).toHaveLength(0)

    useSimulatorStore.getState().handleFreeText('  start demo  ')
    await settle()
    expect(useSimulatorStore.getState().currentNodeId).toBe(flow.start)
    expect(useSimulatorStore.getState().history[0].message).toMatchObject({ sender: 'user', text: '  start demo  ' })
    expect(useSimulatorStore.getState().history[1].message).toMatchObject({ sender: 'business', text: 'Welcome' })
  })

  it('keeps WhatsApp automatic startup and permits duplicate missing triggers', async () => {
    expect(useSimulatorStore.getState().loadScenarioSource(flowSource('whatsapp'), 'json')).toBe(true)
    await settle()
    expect(useSimulatorStore.getState().currentNodeId).toBe('welcome')

    const first = useSimulatorStore.getState().importCustomScenario(flowSource('whatsapp'), 'json')
    const second = useSimulatorStore.getState().importCustomScenario(flowSource('whatsapp'), 'json')
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
  })

  it('starts each RCS Demo Menu selection immediately, while direct loads still wait for their trigger', async () => {
    const targets = [
      { id: 'singapore-airlines', metadataId: 'singapore-airlines-boarding-pass' },
      { id: 'dominos-singapore-rcs-demo', metadataId: 'dominos-singapore-rcs-demo' },
      { id: 'vbank-multifinance-first-repayment', metadataId: 'vbank-multifinance-first-repayment' },
    ]
    for (const target of targets) {
      const targetId = target.id
      useSimulatorStore.getState().loadBuiltInScenario('rcs-demo-menu')
      useSimulatorStore.getState().handleFreeText(' rcs menu ')
      await settle()
      const menuMessage = useSimulatorStore.getState().history.at(-1)?.message
      expect(menuMessage?.type).toBe('carousel')
      if (menuMessage?.type !== 'carousel') continue
      const card = menuMessage.cards.find((entry) => entry.id === targetId)
      expect(card).toBeDefined()
      const action = card?.actions?.[0]
      expect(action?.type).toBe('reply')
      if (!action || action.type !== 'reply') continue
      useSimulatorStore.getState().handleAction(action)
      await settle()
      expect(useSimulatorStore.getState().flow?.metadata.id).toBe(target.metadataId)
      expect(useSimulatorStore.getState().currentNodeId).toBe(useSimulatorStore.getState().flow?.start)
      expect(useSimulatorStore.getState().history.at(-1)?.message.sender).toBe('business')
    }

    useSimulatorStore.getState().loadBuiltInScenario('singapore-airlines')
    expect(useSimulatorStore.getState().currentNodeId).toBeNull()
    expect(useSimulatorStore.getState().history).toHaveLength(0)
  })

  it('ignores unknown or non-RCS scenario-start ids', async () => {
    useSimulatorStore.getState().loadBuiltInScenario('rcs-demo-menu')
    useSimulatorStore.getState().handleFreeText('RCS MENU')
    await settle()
    const before = useSimulatorStore.getState().flow?.metadata.id
    useSimulatorStore.getState().handleAction({ type: 'reply', label: 'Unknown', startScenarioId: 'missing' })
    expect(useSimulatorStore.getState().flow?.metadata.id).toBe(before)
    useSimulatorStore.getState().handleAction({ type: 'reply', label: 'WhatsApp', startScenarioId: 'ecommerce' })
    expect(useSimulatorStore.getState().flow?.metadata.id).toBe(before)
  })
})

describe('custom RCS trigger uniqueness', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useSimulatorStore.setState({ liveSessionActive: false, customScenarios: [] })
  })

  it('rejects built-in and custom normalized trigger collisions while allowing an edit in place', () => {
    const builtInCollision = useSimulatorStore.getState().importCustomScenario(flowSource('rcs', ' SIA START '), 'json')
    expect(builtInCollision).toMatchObject({ success: false })
    expect(builtInCollision.error).toContain('Airline boarding pass')

    const first = useSimulatorStore.getState().importCustomScenario(flowSource('rcs', 'CUSTOM START'), 'json')
    expect(first.success).toBe(true)
    const duplicate = useSimulatorStore.getState().importCustomScenario(flowSource('rcs', ' custom start '), 'json')
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toContain('Test flow')

    const saved = useSimulatorStore.getState().saveCustomScenario(first.id!, { source: flowSource('rcs', 'CUSTOM START') })
    expect(saved.success).toBe(true)
  })
})
