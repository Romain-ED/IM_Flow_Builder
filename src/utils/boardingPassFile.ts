export interface BoardingPassFileData {
  passengerName: string
  airline: string
  flightNumber: string
  date: string
  originCode: string
  originCity: string
  destinationCode: string
  destinationCity: string
  departureTime: string
  boardingTime?: string
  gate?: string
  terminal?: string
  seat?: string
  boardingGroup?: string
  bookingReference: string
  cabinClass?: string
}

/** Small seeded PRNG so the barcode/QR placeholder is stable per booking reference. */
export function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0
    return h / 0xffffffff
  }
}

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: string) {
  const rand = seededRandom(seed)
  let cursor = x
  ctx.fillStyle = '#111827'
  while (cursor < x + w) {
    const barWidth = 1 + Math.floor(rand() * 3)
    if (rand() > 0.42) {
      ctx.fillRect(cursor, y, barWidth, h)
    }
    cursor += barWidth + 1
  }
}

function drawQrPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: string) {
  const rand = seededRandom(`qr-${seed}`)
  const cells = 14
  const cell = size / cells
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = '#111827'
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const isFinder =
        (row < 3 && col < 3) || (row < 3 && col >= cells - 3) || (row >= cells - 3 && col < 3)
      if (isFinder ? (row + col) % 2 === 0 : rand() > 0.55) {
        ctx.fillRect(x + col * cell, y + row * cell, cell - 0.5, cell - 0.5)
      }
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Renders a stylised boarding pass to a canvas and returns it as a PNG blob.
 * No real ticketing data is encoded — the barcode/QR are visual placeholders
 * only, seeded from the booking reference for a stable look.
 */
export function renderBoardingPassCanvas(data: BoardingPassFileData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const width = 1000
  const height = 420
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Background
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, width, height)
  roundRect(ctx, 16, 16, width - 32, height - 32, 20)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.stroke()

  const stubX = width - 260
  // Header
  ctx.fillStyle = '#0f172a'
  roundRect(ctx, 16, 16, width - 32, 76, 20)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(16, 72, width - 32, 20)
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 22px system-ui, sans-serif'
  ctx.fillText(data.airline, 40, 62)
  ctx.font = '500 14px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('BOARDING PASS', width - 40, 62)
  ctx.textAlign = 'left'

  // Route
  ctx.fillStyle = '#0f172a'
  ctx.font = '700 46px system-ui, sans-serif'
  ctx.fillText(data.originCode, 40, 165)
  ctx.font = '400 13px system-ui, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText(data.originCity, 40, 185)

  ctx.font = '700 46px system-ui, sans-serif'
  ctx.fillStyle = '#0f172a'
  const destWidth = ctx.measureText(data.destinationCode).width
  ctx.fillText(data.destinationCode, stubX - 60 - destWidth, 165)
  ctx.font = '400 13px system-ui, sans-serif'
  ctx.fillStyle = '#64748b'
  const destCityWidth = ctx.measureText(data.destinationCity).width
  ctx.fillText(data.destinationCity, stubX - 60 - destCityWidth, 185)

  // Plane path
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.moveTo(150, 150)
  ctx.lineTo(stubX - 190, 150)
  ctx.stroke()
  ctx.setLineDash([])

  const fields: [string, string][] = [
    ['PASSENGER', data.passengerName],
    ['FLIGHT', data.flightNumber],
    ['DATE', data.date],
    ['DEPARTS', data.departureTime],
    ['GATE', data.gate ?? '—'],
    ['SEAT', data.seat ?? '—'],
    ['GROUP', data.boardingGroup ?? '—'],
    ['CLASS', data.cabinClass ?? '—'],
  ]
  const colWidth = (stubX - 80) / 4
  fields.forEach(([label, value], i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = 40 + col * colWidth
    const y = 240 + row * 60
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.fillText(label, x, y)
    ctx.fillStyle = '#0f172a'
    ctx.font = '600 18px system-ui, sans-serif'
    ctx.fillText(value, x, y + 22)
  })

  // Perforated divider + stub
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(stubX, 24)
  ctx.lineTo(stubX, height - 24)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 15px system-ui, sans-serif'
  ctx.fillText(data.flightNumber, stubX + 24, 50)
  ctx.font = '400 12px system-ui, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText(`${data.originCode} → ${data.destinationCode}`, stubX + 24, 68)

  drawQrPlaceholder(ctx, stubX + 24, 90, 140, data.bookingReference)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '600 11px system-ui, sans-serif'
  ctx.fillText('BOOKING REF', stubX + 24, 254)
  ctx.fillStyle = '#0f172a'
  ctx.font = '700 20px system-ui, sans-serif'
  ctx.fillText(data.bookingReference, stubX + 24, 278)

  drawBarcode(ctx, stubX + 24, 320, 196, 60, data.bookingReference)

  return canvas
}

export function downloadBoardingPassImage(data: BoardingPassFileData): Promise<void> {
  return new Promise((resolve) => {
    const canvas = renderBoardingPassCanvas(data)
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve()
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `BoardingPass-${data.flightNumber}-${data.bookingReference}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      resolve()
    }, 'image/png')
  })
}
