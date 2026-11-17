import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { ImageWithFallback } from './ImageWithFallback'

describe('ImageWithFallback', () => {
  afterEach(() => cleanup())

  it('does not request an image whose URL still has a variable placeholder', () => {
    const { container } = render(<ImageWithFallback src="/assets/{{product}}.png" alt="Product" />)

    expect(container.querySelector('img')).toBeNull()
  })

  it('loads an ordinary image URL', () => {
    const { container } = render(<ImageWithFallback src="/assets/logo.png" alt="Logo" />)

    expect(container.querySelector('img')).not.toBeNull()
  })
})
