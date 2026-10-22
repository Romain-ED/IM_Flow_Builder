import { describe, expect, it } from 'vitest'
import { validateFlowWithChannelCompliance } from '../channels/validateChannelCompliance'
import { computeNodePlan, resolveAction, resolveChoice } from '../engine/ConversationEngine'
import { preflightLiveRcsFlow } from '../live/rcsPreflight'
import { flowDefinitionSchema, type FlowDefinition } from '../schema/flow'
import type { Action, Choice, VariableMap } from '../schema/messages'
import { parseFlowSource } from '../utils/flowSource'
import { BUILT_IN_SCENARIOS } from './index'

const scenarioId = 'vbank-multifinance-first-repayment'

function loadScenario(): FlowDefinition {
  const scenario = BUILT_IN_SCENARIOS.find((entry) => entry.id === scenarioId)
  expect(scenario?.name).toBe('V Bank: From just curious to first repayment')
  expect(scenario).toBeDefined()
  const parsed = parseFlowSource(scenario!.source, 'yaml')
  expect(parsed.success).toBe(true)
  if (!parsed.success) throw new Error(parsed.message)
  return flowDefinitionSchema.parse(parsed.data)
}

function findReply(flow: FlowDefinition, nodeId: string, label: string): Choice | Action {
  const node = flow.nodes.find((entry) => entry.id === nodeId)
  expect(node).toBeDefined()
  for (const message of node!.messages ?? []) {
    if (message.type === 'suggested_replies') {
      const choice = message.options.find((option) => option.label === label)
      if (choice) return choice
    }
    if (message.type === 'rich_card') {
      const action = message.actions?.find((entry) => entry.label === label)
      if (action) return action
    }
    if (message.type === 'carousel') {
      for (const card of message.cards) {
        const action = card.actions?.find((entry) => entry.label === label)
        if (action) return action
      }
    }
  }
  throw new Error(`Reply/action ${label} was not found on ${nodeId}`)
}

describe('V Bank multifinance RCS scenario', () => {
  it('is registered, parses, validates, and has a unique kebab-case RCS id', () => {
    const scenario = BUILT_IN_SCENARIOS.find((entry) => entry.id === scenarioId)
    expect(scenario).toMatchObject({
      id: scenarioId,
      name: 'V Bank: From just curious to first repayment',
      description: 'Discovery → indicative eligibility → Personal Loan application → first repayment.'
    })
    expect(BUILT_IN_SCENARIOS.filter((entry) => entry.id === scenarioId)).toHaveLength(1)

    const flow = loadScenario()
    expect(flow.metadata).toMatchObject({ id: scenarioId, channel: 'rcs' })
    expect(flow.metadata.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(flow.brand).toMatchObject({
      avatar: '/assets/V%20Bank/logo.jpg',
      logo: '/assets/V%20Bank/logo.jpg',
      banner: '/assets/V%20Bank/banner%20wide.jpg',
    })
    expect(flow.defaults).toMatchObject({ messageDelayMs: 0, typingDurationMs: 700 })
    const welcomePlan = computeNodePlan(flow, 'welcome', flow.variables ?? {})
    const welcomeTypingSteps = welcomePlan.steps.filter((step) => step.kind === 'typing')
    expect(welcomeTypingSteps).toHaveLength(3)
    expect(welcomeTypingSteps.every((step) => step.durationMs === 700)).toBe(true)
    expect(validateFlowWithChannelCompliance(flow).success).toBe(true)
  })

  it('has the exact three-card discovery carousel and resolves every graph reference', () => {
    const flow = loadScenario()
    const welcome = flow.nodes.find((node) => node.id === 'welcome')!
    const carousel = welcome.messages?.find((message) => message.type === 'carousel')
    expect(carousel?.type).toBe('carousel')
    if (!carousel || carousel.type !== 'carousel') return
    expect(carousel.cards.map((card) => card.title)).toEqual(['Personal Loan', 'Car Loan', 'Home Mortgage'])
    expect(carousel.cards.map((card) => card.image)).toEqual([
      '/assets/V%20Bank/2.jpg',
      '/assets/V%20Bank/car%20loan.jpg',
      '/assets/V%20Bank/home%20mortgage.jpg',
    ])

    const nodeIds = new Set(flow.nodes.map((node) => node.id))
    const targets: Array<string | undefined> = []
    for (const node of flow.nodes) {
      targets.push(node.next, node.then, node.else, node.freeTextNext)
      for (const action of node.actions ?? []) targets.push(action.next)
      for (const message of node.messages ?? []) {
        if (message.type === 'suggested_replies') targets.push(...message.options.map((option) => option.next))
        if (message.type === 'carousel') {
          for (const card of message.cards) {
            for (const action of card.actions ?? []) if (action.type === 'reply') targets.push(action.next)
          }
        }
        if ('actions' in message && Array.isArray(message.actions)) {
          for (const action of message.actions) if (action.type === 'reply') targets.push(action.next)
        }
      }
    }
    expect(targets.filter(Boolean).every((target) => nodeIds.has(target!))).toBe(true)
  })

  it('keeps Car Loan and Home Mortgage out of the personal-loan approval path', () => {
    const flow = loadScenario()
    const carousel = flow.nodes.find((node) => node.id === 'welcome')!.messages!.find((message) => message.type === 'carousel')
    expect(carousel?.type).toBe('carousel')
    if (!carousel || carousel.type !== 'carousel') return

    for (const product of ['Car Loan', 'Home Mortgage']) {
      const card = carousel.cards.find((entry) => entry.title === product)!
      const eligibility = card.actions?.find((action) => action.type === 'reply' && action.label === 'Check eligibility')
      expect(eligibility?.type).toBe('reply')
      if (!eligibility || eligibility.type !== 'reply') continue
      expect(eligibility.next).toBe(product === 'Car Loan' ? 'car_eligibility' : 'home_eligibility')
      expect(eligibility.next).not.toBe('consent')
      const outcome = flow.nodes.find((node) => node.id === eligibility.next)!
      expect(outcome.messages?.some((message) => JSON.stringify(message).includes(`${product} eligibility depends`))).toBe(true)
      const personal = outcome.messages?.flatMap((message) => message.type === 'rich_card' ? message.actions ?? [] : [])
        .find((action) => action.type === 'reply' && action.label === 'Personal Loan instead')
      expect(personal?.type === 'reply' ? personal.next : undefined).toBe('consent')
      expect(personal?.type === 'reply' ? personal.set?.selectedProduct : undefined).toBe('personal_loan')
    }
  })

  it('preflights all RCS content and HTTPS handoffs', () => {
    const flow = loadScenario()
    const result = preflightLiveRcsFlow(flow, { publicBaseUrl: 'https://www.vbank.com' })
    expect(result.success, result.errors.map((error) => error.message).join('\n')).toBe(true)
    expect(result.errors).toEqual([])

    const urls = result.nodes.flatMap((node) => node.content.flatMap((content) => [
      ...(content.actions ?? []).filter((action) => action.type === 'open_url').map((action) => action.url),
      ...(content.cards ?? []).flatMap((card) => card.actions.filter((action) => action.type === 'open_url').map((action) => action.url)),
    ]))
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((url) => url?.startsWith('https://'))).toBe(true)
  })

  it('runs the primary journey through receipt with stateful handoff returns', () => {
    const flow = loadScenario()
    const variables = { ...flow.variables } as VariableMap
    const enter = (nodeId: string) => {
      const plan = computeNodePlan(flow, nodeId, variables)
      Object.assign(variables, plan.setVariables ?? {})
      return plan
    }
    const choose = (nodeId: string, label: string) => {
      const selected = findReply(flow, nodeId, label)
      const result = 'type' in selected ? resolveAction(selected, nodeId) : resolveChoice(selected, nodeId)
      expect(result.nextNodeId, `${nodeId}/${label} should navigate`).toBeDefined()
      Object.assign(variables, result.setVariables ?? {})
      return result.nextNodeId!
    }

    enter('welcome')
    let node = choose('welcome', 'Check eligibility')
    node = choose(node, 'Agree & continue')
    node = choose(node, 'Rp 10–20m')
    node = choose(node, 'Permanent Employee')
    node = choose(node, 'No Repayments')
    expect(variables).toMatchObject({ incomeBand: '10_to_20m', employmentStatus: 'permanent', existingRepayments: 'none' })
    enter(node)
    expect(variables.indicativeLimit).toBe('Rp 150,000,000')
    const handoff = findReply(flow, node, 'Choose amount & term')
    const handoffResult = resolveAction(handoff as Action, node)
    expect(handoffResult.externalAction).toMatchObject({ type: 'open_url', url: 'https://secure.vbank.com/apply/amount-term' })
    node = choose(node, "I've chosen")
    expect(variables).toMatchObject({ selectedAmount: 'Rp 60,000,000', termMonths: 24, amountTermStatus: 'selected' })

    enter(node)
    expect(variables.documentsStatus).toBe('0 of 2')
    node = choose(node, 'KTP uploaded')
    enter(node)
    expect(variables.documentsStatus).toBe('1 of 2')
    node = choose(node, 'Payslip uploaded')
    enter(node)
    expect(variables.documentsStatus).toBe('2 of 2')
    node = choose(node, 'Start identity check')
    const identityPlan = enter(node)
    expect(identityPlan.steps.some((step) => step.kind === 'message')).toBe(true)
    node = choose(node, 'Identity complete')
    enter(node)
    expect(variables.identityStatus).toBe('verified')
    node = choose(node, 'Contract signed')
    enter(node)
    expect(variables).toMatchObject({ contractStatus: 'signed', disbursementStatus: 'confirmed' })
    node = 'repayment_reminder'
    node = choose(node, 'BCA')
    enter(node)
    expect(variables.paymentMethod).toBe('bca')
    node = choose(node, "I've Already Paid")
    enter(node)
    expect(variables.paymentStatus).toBe('checking')
    node = choose(node, 'Payment confirmed')
    enter(node)
    expect(variables.paymentStatus).toBe('received')
    const receipt = findReply(flow, node, 'View receipt')
    expect(resolveAction(receipt as Action, node).externalAction).toMatchObject({
      type: 'open_url',
      url: 'https://secure.vbank.com/receipt/VB-PL-261101-0842',
    })
    expect(choose(node, 'Done')).toBe('complete')
  })
})
