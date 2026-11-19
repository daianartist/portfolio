import gsap from 'gsap'
import { bus } from './bus.js'
import { audio } from './audio.js'
import { store } from './store.js'

const PIXEL = 18 // on-screen size of one dissolve block
const PIXEL_RES = 6 // canvas pixels per block (rendered pixelated)
const EDGE = 220 // width of the dissolve front, px
const JITTER = 160 // random offset per block, px
const SPEED = 900 // px/s
const BAR_LENGTH = 27
const BLOCKS = '░▒▓█'

const randomBlock = () => BLOCKS[Math.floor(Math.random() * 4)]

function fillChars(el, text) {
  el.innerHTML = ''
  for (const ch of text) {
    const s = document.createElement('span')
    s.dataset.char = ch
    s.textContent = ch
    s.style.opacity = 0
    el.appendChild(s)
  }
}

/** each character flickers through block glyphs before settling (or vanishing) */
function scrambleChars(el, { duration = 0.9, out = false } = {}) {
  const chars = [...el.querySelectorAll('[data-char]')]
  const windows = chars.map((_, i) => {
    const start = ((out ? chars.length - 1 - i : i) / chars.length) * 0.6 + Math.random() * 0.1
    return [start, start + 0.3]
  })
  const state = { t: 0 }
  return gsap.to(state, {
    t: 1,
    duration,
    ease: 'none',
    onUpdate: () => {
      chars.forEach((c, i) => {
        const [a, b] = windows[i]
        const ch = c.dataset.char
        if (ch === ' ') return
        const before = state.t < a
        const after = state.t >= b
        if (out ? after : before) {
          c.textContent = ch
          c.style.opacity = 0
        } else if (out ? before : after) {
          c.textContent = ch
          c.style.opacity = 1
        } else {
          c.textContent = randomBlock()
          c.style.opacity = 1
        }
      })
    },
  })
}

/** progress bar that jumps forward in irregular steps */
function fakeProgress(barEl) {
  const progress = { value: 0 }
  const draw = () => {
    const n = Math.round((progress.value / 100) * BAR_LENGTH)
    barEl.innerHTML = [...('█'.repeat(n) + '░'.repeat(BAR_LENGTH - n))]
      .map((c) => `<span data-char="${c}">${c}</span>`)
      .join('')
  }
  draw()
  const tl = gsap.timeline({ onUpdate: draw })
  let v = 0
  while (v < 100) {
    v = Math.min(100, v + gsap.utils.random(4, 19, 1))
    tl.to(progress, { value: v, duration: gsap.utils.random(0.04, 0.16), ease: 'steps(3)' }).to(
      {},
      { duration: gsap.utils.random(0, 0.18) },
    )
  }
  return tl
}

/** the loader's background breaks into shrinking squares, radiating from the center */
function dissolve(root, canvas, labels) {
  return new Promise((resolve) => {
    const w = window.innerWidth
    const h = window.innerHeight
    const cx = w / 2
    const cy = h / 2
    const cols = Math.ceil(w / PIXEL)
    const rows = Math.ceil(h / PIXEL)
    canvas.width = cols * PIXEL_RES
    canvas.height = rows * PIXEL_RES
    canvas.style.width = `${cols * PIXEL}px`
    canvas.style.height = `${rows * PIXEL}px`
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = store.theme === 'black' ? '#000' : '#fff'
    const jitter = Float32Array.from({ length: cols * rows }, () => Math.random())
    const total = ((Math.hypot(cx, cy) + EDGE + JITTER) / SPEED) * 1000

    // loader labels disappear once the front passes them, uncovering the hero pills
    const targets = labels.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        el,
        distance: Math.hypot(Math.max(Math.abs(r.left + r.width / 2 - cx) - r.width / 2, 0), r.top + r.height / 2 - cy),
      }
    })

    const draw = (front) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const px = (x + 0.5) * PIXEL
          const py = (y + 0.5) * PIXEL
          const d = Math.hypot(px - cx, py - cy) + jitter[y * cols + x] * JITTER
          const p = Math.min(1, Math.max(0, (front - d) / EDGE + 1))
          if (p >= 1) continue
          const size = Math.round((1 - p) * PIXEL_RES)
          if (!size) continue
          const o = Math.floor((PIXEL_RES - size) / 2)
          ctx.fillRect(x * PIXEL_RES + o, y * PIXEL_RES + o, size, size)
        }
      targets.forEach((t) => {
        if (front > t.distance + JITTER * 0.5) t.el.style.opacity = 0
      })
    }

    draw(-380)
    root.classList.add('is-revealing')
    bus('LOADER:START').emit()
    bus('CANVAS:RIPPLE').emit({ x: cx, y: cy, power: 2 })
    audio.whoosh()
    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      draw((t / 1000) * SPEED - EDGE)
      if (t < total) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

const waitForScene = () =>
  new Promise((resolve) => {
    if (store.sceneReady) return resolve()
    const off = bus('SCENE:READY').on(done)
    const timer = setTimeout(done, 6000)
    function done() {
      off()
      clearTimeout(timer)
      resolve()
    }
  })

export async function runLoader({ name, role, hint }) {
  const root = document.querySelector('.loader')
  const canvas = root.querySelector('.loader-canvas')
  const nameEl = root.querySelector('.loader-name')
  const roleEl = root.querySelector('.loader-role')
  const barEl = root.querySelector('.loader-bar span')
  const hintEl = root.querySelector('.loader-hint')
  fillChars(nameEl, name)
  fillChars(roleEl, role)
  fillChars(hintEl, hint)

  if (store.reducedMotion) {
    root.querySelectorAll('[data-char]').forEach((c) => (c.style.opacity = 1))
    await Promise.all([document.fonts.ready, waitForScene()])
    bus('LOADER:START').emit()
    await gsap.to(root, { opacity: 0, duration: 0.6, delay: 0.4 })
    root.classList.add('is-done')
    return
  }

  scrambleChars(nameEl, { duration: 1 }).delay(0.2)
  scrambleChars(roleEl, { duration: 1.1 }).delay(0.35)
  scrambleChars(hintEl, { duration: 1.1 }).delay(0.5)
  await Promise.all([fakeProgress(barEl).delay(0.3), document.fonts.ready, waitForScene()])
  await gsap.delayedCall(0.6, () => {})
  scrambleChars(hintEl, { duration: 0.35, out: true }).delay(0.25)
  await scrambleChars(barEl, { duration: 0.35, out: true }).delay(0.25)
  await dissolve(root, canvas, [nameEl, roleEl])
  root.classList.add('is-done')
}
