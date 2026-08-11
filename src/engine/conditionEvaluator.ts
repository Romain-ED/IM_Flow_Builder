import type { Condition } from '../schema/flow'
import type { VariableMap } from '../schema/messages'

/**
 * Evaluates a single declarative condition against the current variable set.
 * Deliberately a fixed set of operators — no arbitrary JS expressions/eval.
 */
export function evaluateCondition(condition: Condition, variables: VariableMap): boolean {
  const actual = variables[condition.variable]

  switch (condition.operator) {
    case 'exists':
      return actual !== undefined && actual !== null
    case 'equals':
      return actual === condition.value
    case 'not_equals':
      return actual !== condition.value
    case 'contains':
      if (typeof actual === 'string') {
        return actual.includes(String(condition.value ?? ''))
      }
      return false
    case 'greater_than': {
      const a = Number(actual)
      const b = Number(condition.value)
      return !Number.isNaN(a) && !Number.isNaN(b) && a > b
    }
    case 'less_than': {
      const a = Number(actual)
      const b = Number(condition.value)
      return !Number.isNaN(a) && !Number.isNaN(b) && a < b
    }
    default:
      return false
  }
}
