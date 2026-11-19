import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { audio } from './audio.js'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin)

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SCRAMBLE_CHARS = '.,:;i1tL0@▒▓▓▓██'

/**
 * Hovering a letter knocks it off: it tumbles to the bottom of the screen,
 * then drops back into place a moment later.
 */
export function fallingLetters(el) {
  if (reduced()) return
  const split = new SplitText(el, { type: 'words,chars', charsClass: 'fall-char', aria: false })
  split.chars.forEach((c) => c.addEventListener('pointerenter', () => fall(c)))
  return split
}

function fall(el) {
  if (el.dataset.falling) return
  el.dataset.falling = '1'
  const { top } = el.getBoundingClientRect()
  const distance = window.innerHeight - top + 80
  audio.blip({ pitch: 0.5 + Math.random() * 0.5, volume: 0.03, decay: 0.12 })
  gsap
    .timeline({ onComplete: () => delete el.dataset.falling })
    .to(el, {
      y: distance,
      x: gsap.utils.random(-80, 80),
      rotation: gsap.utils.random(-260, 260),
      duration: 0.7 + distance / 1600,
      ease: 'power2.in',
    })
    .set(el, { autoAlpha: 0 })
    .set(el, { x: 0, y: -24, rotation: 0 }, `+=${gsap.utils.random(1.2, 2.2)}`)
    .to(el, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(2.5)' })
}

/**
 * Text resolves from block characters. The original text keeps its place
 * (invisible) so layout never jumps; the scramble runs in an overlay.
 */
export function scrambleText(el, { delay = 0, rightToLeft = false, start = false, falling = false } = {}) {
  const text = el.textContent
  el.style.position = 'relative'
  el.innerHTML = ''
  const ghost = document.createElement('div')
  ghost.style.opacity = 0
  ghost.innerText = text
  const overlay = document.createElement('div')
  Object.assign(overlay.style, { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', whiteSpace: 'nowrap' })
  el.append(ghost, overlay)

  gsap.to(overlay, {
    duration: 1,
    delay,
    ease: 'power2.in',
    scrollTrigger: start ? { trigger: el, start, once: true } : undefined,
    scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 1.5, delimiter: ' ', rightToLeft, tweenLength: true },
    onComplete: falling ? () => fallingLetters(overlay) : undefined,
  })
}

/** Paragraph lines slide up out of masks, one after another. */
export function revealLines({ trigger, elements, duration = 0.7, stagger = 0.12, start = 'top 80%', falling = false }) {
  if (!elements || !trigger) return
  const split = new SplitText(elements, { type: 'lines', linesClass: 'split-line', aria: 'hidden' })
  split.lines.forEach((line) => {
    if (line.parentNode.classList.contains('line-mask')) return
    const mask = document.createElement('div')
    mask.className = 'line-mask'
    line.parentNode.insertBefore(mask, line)
    mask.appendChild(line)
  })
  if (falling) fallingLetters(split.lines)
  gsap.set(split.lines, { yPercent: 100, opacity: 0 })
  gsap.to(split.lines, {
    yPercent: 0,
    opacity: 1,
    duration,
    stagger,
    ease: 'power2.out',
    // once in place, let knocked-off letters fall outside their line mask
    onComplete: falling ? () => split.lines.forEach((l) => (l.parentNode.style.overflow = 'visible')) : undefined,
    scrollTrigger: { trigger, start, once: true },
  })
}
