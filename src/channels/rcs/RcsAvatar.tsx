import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { assetUrl } from '../../utils/assetUrl'

export function RcsAvatar({ size = 36, src, name = 'RCS account' }: { size?: number; src?: string; name?: string }) {
  const [errored, setErrored] = useState(false)

  if (src && !errored) {
    return (
      <img
        src={assetUrl(src)}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-[28%] object-cover shadow-sm"
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    )
  }

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-[#0b7a55] text-white shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="absolute inset-[17%] rounded-[22%] border-[1.5px] border-white/90" />
      <span className="absolute left-[27%] top-[29%] h-[10%] w-[10%] rounded-full bg-white" />
      <span className="absolute left-[45%] top-[29%] h-[10%] w-[10%] rounded-full bg-white" />
      <MessageCircle size={size * 0.34} strokeWidth={2.4} className="absolute bottom-[16%] right-[14%] text-white/90" />
      <span className="absolute bottom-[18%] left-[25%] text-[0.42em] font-bold leading-none">R</span>
    </span>
  )
}
