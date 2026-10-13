import { MessageCircle } from 'lucide-react'

export function RcsAvatar({ size = 36 }: { size?: number }) {
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
