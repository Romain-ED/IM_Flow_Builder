import { useEffect, useMemo, useState } from 'react'
import { validateFlow } from '../../engine/flowValidator'
import { parseFlowSource } from '../../utils/flowSource'
import { assetUrl } from '../../utils/assetUrl'
import {
  RCS_CROP_WARNING_THRESHOLD,
  collectRcsMediaRefs,
  getCropInfo,
  type RcsMediaRef,
} from '../../channels/rcs/mediaRatios'

type Size = { width: number; height: number } | 'error'

function useImageSizes(images: string[]): Record<string, Size> {
  const [sizes, setSizes] = useState<Record<string, Size>>({})
  const key = images.join('\n')
  useEffect(() => {
    let cancelled = false
    for (const image of key ? key.split('\n') : []) {
      const probe = new Image()
      probe.onload = () => {
        if (!cancelled) setSizes((prev) => ({ ...prev, [image]: { width: probe.naturalWidth, height: probe.naturalHeight } }))
      }
      probe.onerror = () => {
        if (!cancelled) setSizes((prev) => ({ ...prev, [image]: 'error' }))
      }
      probe.src = assetUrl(image)
    }
    return () => {
      cancelled = true
    }
  }, [key])
  return sizes
}

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`

function CropRow({ media, size }: { media: RcsMediaRef; size: Size | undefined }) {
  const heading = `${media.kind} · ${media.mediaHeight} · ${media.label}`
  if (!size) return <p className="m-0 text-[12px] text-slate-400">{heading}: loading…</p>
  if (size === 'error') {
    return <p className="m-0 text-[12px] text-slate-500">{heading}: image could not be loaded to check its ratio.</p>
  }
  const crop = getCropInfo(size.width, size.height, media.targetRatio)
  const flagged = crop.fraction > RCS_CROP_WARNING_THRESHOLD
  const half = `${(crop.fraction / 2) * 100}%`
  return (
    <div className={`rounded-lg px-2.5 py-2 ${flagged ? 'bg-amber-50' : 'bg-emerald-50'}`}>
      <div className="relative w-full overflow-hidden rounded" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
        <img src={assetUrl(media.image)} alt="" className="block h-full w-full" />
        {crop.axis === 'top-bottom' && (
          <>
            <div className="absolute inset-x-0 top-0 bg-black/55" style={{ height: half }} />
            <div className="absolute inset-x-0 bottom-0 bg-black/55" style={{ height: half }} />
          </>
        )}
        {crop.axis === 'sides' && (
          <>
            <div className="absolute inset-y-0 left-0 bg-black/55" style={{ width: half }} />
            <div className="absolute inset-y-0 right-0 bg-black/55" style={{ width: half }} />
          </>
        )}
      </div>
      <p className={`m-0 mt-1.5 text-[12px] ${flagged ? 'text-amber-700' : 'text-emerald-700'}`}>
        <strong>{heading}</strong>
        <br />
        {size.width}×{size.height} ({(size.width / size.height).toFixed(2)}:1), shown at {media.targetRatio}:1.{' '}
        {crop.axis === 'none' || !flagged
          ? 'Fits.'
          : `About ${pct(crop.fraction)} of the ${crop.axis === 'sides' ? 'width' : 'height'} is cropped (dimmed area).`}
      </p>
    </div>
  )
}

/**
 * Checks each RCS card image in the draft against the ratio Google Messages
 * crops to, and dims the part that will be cut off.
 */
export function MediaCropReport({ draft }: { draft: string }) {
  const refs = useMemo(() => {
    const parsed = parseFlowSource(draft)
    if (!parsed.success) return []
    const validation = validateFlow(parsed.data)
    return validation.success ? collectRcsMediaRefs(validation.flow) : []
  }, [draft])
  const sizes = useImageSizes(useMemo(() => [...new Set(refs.map((ref) => ref.image))], [refs]))

  if (refs.length === 0) return null
  return (
    <div className="mt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">RCS media crop</h3>
      <div className="flex flex-col gap-2">
        {refs.map((ref) => (
          <CropRow key={ref.key} media={ref} size={sizes[ref.image]} />
        ))}
      </div>
    </div>
  )
}
