import { describe, it, expect } from 'vitest'
import { evaluateCondition } from './conditionEvaluator'

describe('evaluateCondition', () => {
  it('equals: true when values match', () => {
    expect(evaluateCondition({ variable: 'seat', operator: 'equals', value: '21A' }, { seat: '21A' })).toBe(true)
  })

  it('equals: false when values differ', () => {
    expect(evaluateCondition({ variable: 'seat', operator: 'equals', value: '21A' }, { seat: '21C' })).toBe(false)
  })

  it('not_equals: true when values differ', () => {
    expect(evaluateCondition({ variable: 'seat', operator: 'not_equals', value: '21A' }, { seat: '21C' })).toBe(true)
  })

  it('exists: true when variable is set and not null', () => {
    expect(evaluateCondition({ variable: 'seat', operator: 'exists' }, { seat: '21A' })).toBe(true)
  })

  it('exists: false when variable is undefined', () => {
    expect(evaluateCondition({ variable: 'seat', operator: 'exists' }, {})).toBe(false)
  })

  it('exists: false when variable is null', () => {
    expect(evaluateCondition({ variable: 'seat', operator: 'exists' }, { seat: null })).toBe(false)
  })

  it('contains: true for substring match', () => {
    expect(
      evaluateCondition({ variable: 'msg', operator: 'contains', value: 'lo w' }, { msg: 'hello world' }),
    ).toBe(true)
  })

  it('contains: false for non-string variable', () => {
    expect(evaluateCondition({ variable: 'n', operator: 'contains', value: '1' }, { n: 123 })).toBe(false)
  })

  it('greater_than: numeric comparison', () => {
    expect(evaluateCondition({ variable: 'age', operator: 'greater_than', value: 18 }, { age: 21 })).toBe(true)
    expect(evaluateCondition({ variable: 'age', operator: 'greater_than', value: 18 }, { age: 10 })).toBe(false)
  })

  it('less_than: numeric comparison', () => {
    expect(evaluateCondition({ variable: 'age', operator: 'less_than', value: 18 }, { age: 10 })).toBe(true)
  })

  it('greater_than: false for non-numeric values', () => {
    expect(
      evaluateCondition({ variable: 'age', operator: 'greater_than', value: 18 }, { age: 'not-a-number' }),
    ).toBe(false)
  })

  it('equals: works with boolean values', () => {
    expect(evaluateCondition({ variable: 'checkedIn', operator: 'equals', value: true }, { checkedIn: true })).toBe(
      true,
    )
  })
})
