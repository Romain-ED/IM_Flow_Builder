import { seededRandom } from '../../utils/boardingPassFile'

/** Deterministic, purely decorative QR-style grid. Encodes no real data. */
export function QrPlaceholder({ seed, size = 88 }: { seed: string; size?: number }) {
  const cells = 12
  const rand = seededRandom(`qr-${seed}`)
  const cell = size / cells
  const squares: { x: number; y: number }[] = []
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const isFinder =
        (row < 3 && col < 3) || (row < 3 && col >= cells - 3) || (row >= cells - 3 && col < 3)
      if (isFinder ? (row + col) % 2 === 0 : rand() > 0.55) {
        squares.push({ x: col * cell, y: row * cell })
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Boarding pass QR code placeholder">
      <rect width={size} height={size} fill="white" />
      {squares.map((sq, i) => (
        <rect key={i} x={sq.x} y={sq.y} width={cell - 0.5} height={cell - 0.5} fill="#0f172a" />
      ))}
    </svg>
  )
}

/** Deterministic, purely decorative barcode. Encodes no real data. */
export function BarcodePlaceholder({ seed, width = 200, height = 46 }: { seed: string; width?: number; height?: number }) {
  const rand = seededRandom(seed)
  const bars: { x: number; w: number }[] = []
  let cursor = 0
  while (cursor < width) {
    const barWidth = 1 + Math.floor(rand() * 3)
    if (rand() > 0.42) bars.push({ x: cursor, w: barWidth })
    cursor += barWidth + 1
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Boarding pass barcode placeholder">
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.w} height={height} fill="#0f172a" />
      ))}
    </svg>
  )
}
