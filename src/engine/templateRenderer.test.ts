import { describe, it, expect } from 'vitest'
import { renderTemplate, deepInterpolate } from './templateRenderer'

describe('renderTemplate', () => {
  it('replaces a single variable', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'Romain' })).toBe('Hello Romain')
  })

  it('replaces multiple occurrences of different variables', () => {
    expect(
      renderTemplate('{{a}} and {{b}} and {{a}}', { a: 'X', b: 'Y' }),
    ).toBe('X and Y and X')
  })

  it('tolerates surrounding whitespace inside braces', () => {
    expect(renderTemplate('{{  name }}', { name: 'Romain' })).toBe('Romain')
  })

  it('replaces missing variables with an empty string', () => {
    expect(renderTemplate('Hello {{missing}}', {})).toBe('Hello ')
  })

  it('replaces null variables with an empty string', () => {
    expect(renderTemplate('Value: {{v}}', { v: null })).toBe('Value: ')
  })

  it('stringifies numbers and booleans', () => {
    expect(renderTemplate('{{n}} {{b}}', { n: 42, b: true })).toBe('42 true')
  })

  it('does not evaluate arbitrary expressions', () => {
    // Anything that isn't a bare identifier is left untouched — no eval, no ternaries.
    expect(renderTemplate('{{1+1}}', { '1+1': 'nope' })).toBe('{{1+1}}')
  })

  it('leaves plain text without placeholders unchanged', () => {
    expect(renderTemplate('No placeholders here.', { name: 'x' })).toBe('No placeholders here.')
  })
})

describe('deepInterpolate', () => {
  it('interpolates strings inside nested objects and arrays', () => {
    const result = deepInterpolate(
      {
        title: 'Hi {{name}}',
        nested: { code: '{{code}}' },
        list: ['{{name}}', 'static'],
        count: 3,
        active: true,
      },
      { name: 'Romain', code: 'SIN' },
    )
    expect(result).toEqual({
      title: 'Hi Romain',
      nested: { code: 'SIN' },
      list: ['Romain', 'static'],
      count: 3,
      active: true,
    })
  })
})
