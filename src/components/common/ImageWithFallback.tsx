import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface ImageWithFallbackProps {
  src?: string
  alt: string
  className?: string
  style?: React.CSSProperties
}

export function ImageWithFallback({ src, alt, className = '', style }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
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
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setErrored(true)}
    />
  )
}
