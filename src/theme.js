// Theme switch: the new theme spreads from the click point as a field of
// growing pixel squares (a canvas-generated mask on a View Transition).

const PIXEL = 18
const PIXEL_RES = 6
const EDGE = 170
const JITTER = 140
const SPEED = 900

export async function pixelTransition(x, y, update) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduced) {
    await update()
    return
  }
  const w = window.innerWidth
  const h = window.innerHeight
  const cols = Math.ceil(w / PIXEL)
  const rows = Math.ceil(h / PIXEL)
  const canvas = document.createElement('canvas')
  canvas.width = cols * PIXEL_RES
  canvas.height = rows * PIXEL_RES
  const ctx = canvas.getContext('2d')
  const jitter = Float32Array.from({ length: cols * rows }, () => Math.random())
  const total = ((Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + EDGE + JITTER) / SPEED) * 1000
  const style = document.createElement('style')
  document.head.appendChild(style)

  const applyMask = () => {
    const url = canvas.toDataURL()
    const size = `${cols * PIXEL}px ${rows * PIXEL}px`
    style.textContent = `::view-transition-new(root){-webkit-mask-image:url(${url});mask-image:url(${url});-webkit-mask-size:${size};mask-size:${size};-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;}`
  }

  const draw = (front) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const px = (c + 0.5) * PIXEL
        const py = (r + 0.5) * PIXEL
        const d = Math.hypot(px - x, py - y) + jitter[r * cols + c] * JITTER
        const p = Math.min(1, Math.max(0, (front - d) / EDGE + 1))
        if (p <= 0) continue
        const size = Math.max(1, Math.round(p * PIXEL_RES))
        const o = Math.floor((PIXEL_RES - size) / 2)
        ctx.fillRect(c * PIXEL_RES + o, r * PIXEL_RES + o, size, size)
      }
    applyMask()
  }

  draw(-310)
  const transition = document.startViewTransition(update)
  try {
    await transition.ready
  } catch {
    style.remove()
    return
  }
  // keep the pseudo element alive for as long as the mask animates
  document.documentElement.animate({ opacity: [1, 1] }, { duration: total, pseudoElement: '::view-transition-new(root)' })
  const t0 = performance.now()
  const tick = () => {
    const t = performance.now() - t0
    draw((t / 1000) * SPEED)
    if (t < total) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  transition.finished.finally(() => style.remove())
}
