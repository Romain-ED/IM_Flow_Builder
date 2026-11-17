/** Padding (2 × 10 px) and border (2 × 1 px) around a node's content. */
const CHART_FRAME_CHROME = 22

/** Border-box width of a node frame whose content is `contentWidth` wide. */
export function chartFrameWidth(contentWidth: number): number {
  return contentWidth + CHART_FRAME_CHROME
}
