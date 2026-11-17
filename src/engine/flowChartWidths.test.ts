import { describe, expect, it } from 'vitest'
import type { FlowNode } from '../schema/flow'
import {
  CAROUSEL_CARD_GAP,
  CHART_BUBBLE_WIDTH,
  CHART_CARD_WIDTH,
  buildChartNodeItems,
  carouselStripWidth,
} from './flowChartItems'

function carousel(cardCount: number) {
  return {
    type: 'carousel',
    cards: Array.from({ length: cardCount }, (_, i) => ({ id: `c${i}`, title: `Card ${i}` })),
  }
}

function node(messages: unknown[]): FlowNode {
  return { id: 'menu', messages } as unknown as FlowNode
}

describe('carouselStripWidth', () => {
  it('adds the card widths and the gaps between them', () => {
    expect(carouselStripWidth(1, 296)).toBe(296)
    expect(carouselStripWidth(3, 296)).toBe(3 * 296 + 2 * CAROUSEL_CARD_GAP)
    expect(carouselStripWidth(0, 296)).toBe(0)
  })
})

describe('buildChartNodeItems content width', () => {
  it('keeps the standard bubble width when there is no carousel', () => {
    const items = buildChartNodeItems(node([{ type: 'text', text: 'Hi', sender: 'business' }]), false)

    expect(items.contentWidth).toBe(CHART_BUBBLE_WIDTH)
  })

  it('keeps the standard width for a short carousel', () => {
    const items = buildChartNodeItems(node([carousel(1)]), false, CHART_CARD_WIDTH)

    expect(items.contentWidth).toBe(CHART_BUBBLE_WIDTH)
  })

  it('widens the node to fit a ten-card carousel in one strip', () => {
    const items = buildChartNodeItems(node([carousel(10)]), false, CHART_CARD_WIDTH)

    expect(items.contentWidth).toBe(10 * CHART_CARD_WIDTH + 9 * CAROUSEL_CARD_GAP)
    expect(items.contentWidth).toBeGreaterThan(CHART_BUBBLE_WIDTH)
  })

  it('uses the widest carousel in the node', () => {
    const items = buildChartNodeItems(node([carousel(4), carousel(6)]), false, CHART_CARD_WIDTH)

    expect(items.contentWidth).toBe(carouselStripWidth(6, CHART_CARD_WIDTH))
  })
})
