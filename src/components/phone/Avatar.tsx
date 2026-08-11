import { Building2 } from 'lucide-react'
import { useState } from 'react'

interface AvatarProps {
  src?: string
  name: string
  size?: number
}

export function Avatar({ src, name, size = 36 }: AvatarProps) {
  const [errored, setErrored] = useState(false)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (src && !errored) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0 bg-slate-200"
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    )
  }

  return (
    <div
      className="rounded-full bg-slate-700 text-white shrink-0 flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name ? initial : <Building2 size={size * 0.5} />}
    </div>
  )
}
