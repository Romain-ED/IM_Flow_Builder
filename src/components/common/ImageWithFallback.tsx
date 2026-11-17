import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { assetUrl } from '../../utils/assetUrl'

interface ImageWithFallbackProps {
  src?: string
  alt: string
  className?: string
  style?: React.CSSProperties
}

export function ImageWithFallback({ src, alt, className = '', style }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false)

  // A URL that still has a {{variable}} placeholder can never load. Show the fallback without requesting it.
  if (!src || errored || src.includes('{{')) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <ImageOff size={28} />
        <span className="text-[11px]">Image unavailable</span>
      </div>
    )
  }

  return (
    <img
      src={assetUrl(src)}
      alt={alt}
      className={className}
      style={style}
      onError={() => setErrored(true)}
    />
  )
}
