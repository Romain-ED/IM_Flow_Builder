import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { NormalizedMessage } from '../engine/types'
import { Carousel } from './Carousel'

describe('Carousel', () => {
  it('uses a fluid phone-width RCS card and responsive medium media', () => {
    const message: NormalizedMessage = {
      runtimeId: 'carousel-1',
      nodeId: 'promotions',
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

    render(<Carousel message={message} channel="rcs" interactive />)

    expect(screen.getAllByRole('listitem')[0]).toHaveStyle({ width: 'min(calc(100% - 16px), 418px)' })
    expect(screen.getByAltText('First card')).toHaveStyle({ aspectRatio: '1.82 / 1' })
  })
})
