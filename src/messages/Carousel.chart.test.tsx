import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { NormalizedMessage } from '../engine/types'
import { Carousel } from './Carousel'

const message: NormalizedMessage = {
  runtimeId: 'carousel-chart',
  nodeId: 'menu',
  timestamp: 1,
  message: {
    type: 'carousel',
    sender: 'business',
    mediaHeight: 'medium',
    cards: [
      { id: 'one', image: '/one.jpg', title: 'First card' },
      { id: 'two', image: '/two.jpg', title: 'Second card' },
    ],
  },
}

describe('Carousel in the flow chart', () => {
  afterEach(() => cleanup())

  it('draws every RCS card at the given fixed width', () => {
    render(<Carousel message={message} channel="rcs" interactive cardWidth={296} />)

    expect(screen.getAllByRole('listitem')[0]).toHaveStyle({ width: '296px' })
    expect(screen.getAllByRole('listitem')[1]).toHaveStyle({ width: '296px' })
  })

  it('sets the media ratio from Google media heights at that card width', () => {
    render(<Carousel message={message} channel="rcs" interactive cardWidth={296} />)

    expect(screen.getByAltText('First card')).toHaveStyle({ aspectRatio: `${296 / 168} / 1` })
  })

  it('does not clip the strip or show scroll arrows', () => {
    const { container } = render(<Carousel message={message} channel="rcs" interactive cardWidth={296} />)

    expect(container.querySelector('[role="list"]')).not.toHaveClass('overflow-x-auto')
    expect(screen.queryByRole('button', { name: 'Scroll carousel right' })).not.toBeInTheDocument()
  })

  it('keeps the phone scroller and fluid card width when no card width is given', () => {
    const { container } = render(<Carousel message={message} channel="rcs" interactive />)

    expect(container.querySelector('[role="list"]')).toHaveClass('overflow-x-auto')
    expect(screen.getAllByRole('listitem')[0]).toHaveStyle({ width: 'min(calc(100% - 16px), 418px)' })
  })
})
