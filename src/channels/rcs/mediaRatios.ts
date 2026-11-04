import type { FlowDefinition } from '../../schema/flow'
import type { MediaHeight } from '../../schema/messages'

/**
 * Google Messages renders RCS card media at a fixed height (short 112 / medium
 * 168 / tall 264 DP) and a width set by the screen, then zooms and
 * center-crops any image that does not match. These are the width:height
 * ratios an image should have to survive that crop untouched.
 *
 * Standalone cards span the screen (card width = screen - 16 DP), so the
 * ratio depends on the device: a 412 DP phone gives the values below, a
 * 360 DP phone is narrower (tall 1.3, medium 2.05) and a wide foldable is
 * flatter (medium ~2.7 measured). Medium and short therefore crop top and
 * bottom on most devices; `tall` (~1.3-1.8) is the height that fits ordinary
 * 3:2 artwork. Carousel values match the simulator's fluid carousel cards
 * (see Carousel.tsx); the Live RCS mapping sends them with a MEDIUM card width.
 */
export const RCS_STANDALONE_TARGET_RATIOS: Record<MediaHeight, number> = {
  short: 3.54,
  medium: 2.36,
  tall: 1.5,
}

export const RCS_CAROUSEL_TARGET_RATIOS: Record<MediaHeight, number> = {
  short: 2.5,
  medium: 1.82,
  tall: 1.5,
}

/** Crops above this share of the image's width or height are flagged. */
export const RCS_CROP_WARNING_THRESHOLD = 0.1

export interface CropInfo {
  /** 'sides' trims left/right, 'top-bottom' trims top/bottom, 'none' is an exact fit. */
  axis: 'sides' | 'top-bottom' | 'none'
  /** Share (0-1) of the image's length along that axis that is cropped away in total. */
  fraction: number
}

export function getCropInfo(naturalWidth: number, naturalHeight: number, targetRatio: number): CropInfo {
  const imageRatio = naturalWidth / naturalHeight
  if (imageRatio > targetRatio) return { axis: 'sides', fraction: 1 - targetRatio / imageRatio }
  if (imageRatio < targetRatio) return { axis: 'top-bottom', fraction: 1 - imageRatio / targetRatio }
  return { axis: 'none', fraction: 0 }
}

export interface RcsMediaRef {
  key: string
  nodeId: string
  kind: 'rich card' | 'carousel card'
  label: string
  image: string
  mediaHeight: MediaHeight
  targetRatio: number
}

/** Lists every RCS rich-card / carousel image in a flow with the ratio it is shown at. */
export function collectRcsMediaRefs(flow: FlowDefinition): RcsMediaRef[] {
  if (flow.metadata.channel !== 'rcs') return []
  const refs: RcsMediaRef[] = []
  const seen = new Set<string>()
  const add = (ref: Omit<RcsMediaRef, 'key'>) => {
    if (ref.image.includes('{{')) return
    const key = `${ref.image}|${ref.kind}|${ref.mediaHeight}`
    if (seen.has(key)) return
    seen.add(key)
    refs.push({ ...ref, key })
  }
  for (const node of flow.nodes) {
    for (const message of node.messages ?? []) {
      if (message.type === 'rich_card' && message.image && message.orientation !== 'horizontal') {
        const mediaHeight = message.mediaHeight ?? 'medium'
        add({ nodeId: node.id, kind: 'rich card', label: message.title, image: message.image, mediaHeight, targetRatio: RCS_STANDALONE_TARGET_RATIOS[mediaHeight] })
      }
      if (message.type === 'carousel') {
        const mediaHeight = message.mediaHeight ?? 'medium'
        for (const card of message.cards) {
          if (!card.image) continue
          add({ nodeId: node.id, kind: 'carousel card', label: card.title, image: card.image, mediaHeight, targetRatio: RCS_CAROUSEL_TARGET_RATIOS[mediaHeight] })
        }
      }
    }
  }
  return refs
}
