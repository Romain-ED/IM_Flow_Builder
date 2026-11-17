import { createContext, useContext } from 'react'

/**
 * Authored index of the message being drawn on the flow chart, or null everywhere
 * else. Buttons read it to put their anchor ID (see `engine/flowAnchors.ts`) on
 * the DOM, so the chart can start each arrow at the right button. The phone never
 * sets it, so the phone renders no anchors.
 */
export const ChartMessageIndexContext = createContext<number | null>(null)

export function useChartMessageIndex(): number | null {
  return useContext(ChartMessageIndexContext)
}
