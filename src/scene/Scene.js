import * as THREE from 'three'
import gsap from 'gsap'
import { AsciiEffect } from './AsciiEffect.js'
import { TextShape, FloatingObject, Letter, BackgroundNoise } from './shapes.js'
import { audio } from '../audio.js'
import { bus } from '../bus.js'

const LIGHT_INTENSITY = 200
// density ramps (light -> dark), one per section
const CHARSETS = [' .,:;i1tL0@▒▓▓▓███', ' ..::0101010101010', ' .,:;-+=*#@▓██████']
const CHARSET_STROKES = [0, 0.8, 0]
const CHARSET_BY_SECTION = { hero: 0, projects: 1, mail: 2 }
const IDLE_RENDER_AFTER = 2000 // ms without activity -> render every other frame
const STATIC_DURATION = 0.6
const MELT_AFTER = 4000 // ms idle before characters start dripping
const TRAIL_LIFE = 650
const POINTER_SPEED_DIV = 10
const POINTER_MAX = 2.2
const lightEase = gsap.parseEase('power3.inOut')
const PROJECTS_LIGHT_X = -3
const MAIL_REVEAL = 0.5

// eased mouse shared by everything
const mouse = new (class {
  constructor() {
    this.first = true
    this.x = Math.random() * 1200
    this.y = Math.random() * 800
    this.easeX = this.x
    this.easeY = this.y
    window.addEventListener('pointermove', (e) => this.move(e), { passive: true })
    gsap.ticker.add(() => this.tick())
  }
  move(e) {
    this.x = e.clientX
    this.y = e.clientY
    if (this.first) {
      this.easeX = this.x
      this.easeY = this.y
    }
    this.first = false
  }
  tick() {
    const r = (v) => Math.round(v * 100) / 100
    this.easeX = r(this.easeX + (this.x - this.easeX) / 3.3)
    this.easeY = r(this.easeY + (this.y - this.easeY) / 3.3)
  }
})()

export class Scene {
  /**
   * @param {HTMLCanvasElement} canvas  fixed full-screen ascii canvas
   * @param {HTMLCanvasElement|null} footerCanvas  inverted copy shown inside the footer
   * @param {{theme:string, shapes:{slug:string, lines:string[], isMobile:boolean}[]}} opts
   */
  constructor(canvas, footerCanvas, { theme, shapes }) {
    this.canvas = canvas
    this.footerCanvas = footerCanvas
    this.theme = theme
    this.shapeDefs = shapes
    this.currentShape = 'hero'
    this.motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.isTouch = window.matchMedia('(pointer: coarse)').matches
    this.pointerAmount = 0
    this.scrollVelocity = 0
    this.magnet = 0
    this.isMagnet = false
    this.melt = { value: 0 }
    this.staticNoise = { value: 0 }
    this.isMelting = false
    this.trail = []
    this.trailHead = { x: 0, y: 0, strength: 0 }
    this.isPointerInside = false
    this.lastPointer = { x: 0, y: 0 }
    this.tilt = { x: 0, y: 0, targetX: 0, targetY: 0, base: null }
    this.frame = 0
    this.lastActivity = performance.now()
    this.lastScrollY = window.scrollY
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.isMobile = this.width < 1024
    this.isFooterVisible = false
    this.animate = this.animate.bind(this)

    this.group = new THREE.Group()
    this.setupScene()
    this.setupEffect()
    this.setupShapes()
    if (!this.isMobile) this.setupObject()
    this.backgroundNoise = new BackgroundNoise(this.scene)
    this.animate()
    this.showShape(this.currentShape)
    this.setupEvents()
  }

  setupScene() {
    this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0xffffff, 3.5, 4)
    this.lightGroup = new THREE.Group()
    this.light = new THREE.PointLight(0xffffff, LIGHT_INTENSITY, 100, 10)
    this.lightGroup.add(this.light)
    this.lightGroup.position.set(-1.2, -1.2, -1.5)
    this.scene.add(this.lightGroup)
    this.scene.add(new THREE.AmbientLight(0xffffff, 1))
    this.renderer = new THREE.WebGLRenderer({ alpha: true })
    this.renderer.setClearColor(0xffffff, 1)
  }

  setupEffect() {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.canvas.style.width = window.innerWidth + 'px'
    this.canvas.style.height = window.innerHeight + 'px'
    this.effect = new AsciiEffect(this.renderer, this.canvas.getContext('2d'), CHARSETS, {
      theme: this.theme,
      motion: this.motion,
      strokes: CHARSET_STROKES,
      font: "andale-mono, 'Andale Mono', 'Courier New', monospace",
    })
    this.effect.setSize(window.innerWidth, window.innerHeight)
  }

  setupShapes() {
    this.shapes?.forEach((s) => {
      this.group.remove(s.root)
      s.dispose()
    })
    this.shapes = this.shapeDefs.filter((d) => d.isMobile === this.isMobile).map((d) => new TextShape(d))
    this.shapes.forEach((s) => this.group.add(s.root))
    this.scene.add(this.group)
  }

  setupObject() {
    this.object = new FloatingObject()
    this.group.add(this.object.root)
  }

  animateIn() {
    this.shapes?.[0]?.animateIn()
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate)
    this.checkSize()
    this.backgroundNoise.update()
    if (this.motion) this.updateMotion()
    this.object?.tick()
    this.frame++
    // when idle, halve the frame rate
    const idle = performance.now() - this.lastActivity > IDLE_RENDER_AFTER && !this.effect.hasActiveRipples()
    if (!(idle && this.frame % 2)) this.render()
  }

  render() {
    this.effect.render(this.scene, this.camera)
    if (!this.footerCanvas || !this.isFooterVisible) return
    this.footerCtx ??= this.footerCanvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const inset = (this.width / 1400) * 20
    const { width, height } = this.footerCanvas
    this.footerCtx.clearRect(0, 0, width, height)
    this.footerCtx.drawImage(this.canvas, inset * dpr, inset * dpr, width, height, 0, 0, width, height)
  }

  updateMotion() {
    const now = performance.now()
    let px = mouse.easeX
    let py = mouse.easeY

    if (this.isTouch) {
      this.tilt.x += (this.tilt.targetX - this.tilt.x) * 0.1
      this.tilt.y += (this.tilt.targetY - this.tilt.y) * 0.1
      px = this.width * (0.5 + this.tilt.x * 0.45)
      py = this.height * (0.5 + this.tilt.y * 0.45)
      const amount = Math.min(1, Math.hypot(this.tilt.x, this.tilt.y) * 1.4)
      this.pointerAmount += (amount - this.pointerAmount) * 0.1
    } else {
      const dist = Math.hypot(mouse.easeX - this.lastPointer.x, mouse.easeY - this.lastPointer.y)
      this.lastPointer.x = mouse.easeX
      this.lastPointer.y = mouse.easeY
      const target = this.isPointerInside ? Math.min(POINTER_MAX, dist / POINTER_SPEED_DIV) : 0
      this.pointerAmount += (target - this.pointerAmount) * 0.35
      if (Math.abs(mouse.x - mouse.easeX) > 0.5) this.lastActivity = now
      this.updateTrail(now)
    }

    const dy = window.scrollY - this.lastScrollY
    this.lastScrollY = window.scrollY
    if (dy !== 0) this.lastActivity = now
    const vel = gsap.utils.clamp(-6, 6, dy * 0.3)
    this.scrollVelocity += (vel - this.scrollVelocity) * 0.15
    this.magnet += (+this.isMagnet - this.magnet) * 0.06
    this.updateMelt(now)

    this.effect.setPointer(px, py, this.pointerAmount)
    this.effect.setMagnet(this.magnet)
    this.effect.setScrollVelocity(this.scrollVelocity)
    this.effect.setMelt(this.melt.value)

    const nx = px / this.width - 0.5
    const ny = py / this.height - 0.5
    this.object?.tilt(nx, ny)

    // while the hero monogram zooms in, the light swings to the center
    const scale = this.shapes?.[0]?.root.scale.x ?? 0
    const rest = this.isMobile ? 0.4 : 1
    const zoom = Math.sqrt(gsap.utils.clamp(0, 1, (scale - rest) / (10 - rest)))
    const isHero = this.currentShape === 'hero'
    if (isHero) {
      const p = this.lightGroup.position
      const tx = gsap.utils.interpolate(-1.2 + nx * 0.5, 0.4, zoom)
      const ty = gsap.utils.interpolate(-1.2 - ny * 0.5, 0.4, zoom)
      const k = 0.03 + zoom * 0.2
      p.x += (tx - p.x) * k
      p.y += (ty - p.y) * k
      p.z += (-1.5 - p.z) * k
    }
    const target = LIGHT_INTENSITY * (1 + (isHero ? Math.min(1, this.pointerAmount) * 0.4 : 0) + zoom * 2.5)
    const k = target > this.light.intensity ? 0.08 : 0.02
    this.light.intensity += (target - this.light.intensity) * k
  }

  updateTrail(now) {
    const x = mouse.easeX
    const y = mouse.easeY
    const head = this.trailHead
    head.x = x
    head.y = y
    head.strength = Math.min(1, this.pointerAmount) * 0.9

    const last = this.trail[0]
    const dist = last ? Math.hypot(x - last.x, y - last.y) : Infinity
    if (dist > 10) {
      const steps = last ? Math.min(4, Math.floor(dist / 10)) : 1
      for (let i = steps; i >= 1; i--) {
        const s = i / steps
        this.trail.unshift({
          x: last ? last.x + (x - last.x) * (1 - s + 1 / steps) : x,
          y: last ? last.y + (y - last.y) * (1 - s + 1 / steps) : y,
          time: now,
          base: head.strength,
        })
      }
      this.trail.length = Math.min(this.trail.length, 23)
    }
    const t = this.trail
    while (t.length && now - t[t.length - 1].time >= TRAIL_LIFE) t.pop()
    for (const p of t) {
      const life = 1 - (now - p.time) / TRAIL_LIFE
      p.strength = life * life * (3 - 2 * life) * p.base
    }
    this.effect.setTrail(head, t)
  }

  updateMelt(now) {
    const idle = now - this.lastActivity
    if (!this.isMelting && idle > MELT_AFTER) {
      this.isMelting = true
      gsap.to(this.melt, { value: 1, duration: 8, ease: 'power2.in', overwrite: 'auto' })
    } else if (this.isMelting && idle < MELT_AFTER) {
      this.isMelting = false
      gsap.to(this.melt, { value: 0, duration: 0.9, ease: 'back.out(2.5)', overwrite: 'auto' })
    }
  }

  markActivity() {
    this.lastActivity = performance.now()
  }

  setTheme(theme) {
    this.theme = theme
    this.effect.setTheme(theme)
  }

  setCharset(i) {
    const u = this.effect.setCharset(i)
    if (u) gsap.to(u, { value: 1, duration: 0.8, ease: 'power1.inOut', overwrite: true })
  }

  ripple(x, y, power = 1) {
    this.markActivity()
    this.effect.addRipple(x, y, power)
  }

  setupDeviceTilt() {
    const onOrient = (e) => {
      if (e.gamma === null || e.beta === null) return
      this.tilt.base ??= { gamma: e.gamma, beta: e.beta }
      const x = gsap.utils.clamp(-1, 1, (e.gamma - this.tilt.base.gamma) / 25)
      const y = gsap.utils.clamp(-1, 1, (e.beta - this.tilt.base.beta) / 25)
      if (Math.hypot(x - this.tilt.targetX, y - this.tilt.targetY) > 0.02) this.markActivity()
      this.tilt.targetX = x
      this.tilt.targetY = y
    }
    const { signal } = this.abort
    const listen = () => window.addEventListener('deviceorientation', onOrient, { passive: true, signal })
    const DOE = window.DeviceOrientationEvent
    if (DOE && typeof DOE.requestPermission === 'function') {
      window.addEventListener(
        'pointerdown',
        () => DOE.requestPermission().then((r) => r === 'granted' && listen()).catch(() => {}),
        { once: true, signal },
      )
    } else if (DOE) listen()
  }

  onKeyDown(e) {
    this.markActivity()
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return
    const arrows = {
      ArrowUp: () => audio.shiftPitch(1),
      ArrowDown: () => audio.shiftPitch(-1),
      ArrowRight: () => audio.shiftEcho(1),
      ArrowLeft: () => audio.shiftEcho(-1),
    }
    if (arrows[e.key]) {
      arrows[e.key]()
      return this.playKey(audio.lastChar)
    }
    if (/^[0-9]$/.test(e.key)) {
      audio.setInstrument(e.key)
      return this.playKey(audio.lastChar)
    }
    if (e.key.length === 1 && /[\p{L}\p{N}?!&@#]/u.test(e.key)) {
      audio.key(e.key)
      this.playKey(e.key)
    }
  }

  playKey(char) {
    if (!this.motion) return
    Letter.play(this.scene, char, { tone: audio.tone, echo: audio.echo })
    this.playStatic(char)
  }

  playStatic(char) {
    this.effect.setStaticKey(char)
    this.effect.setStaticTone(audio.tone)
    const echo = audio.echo
    const echoes = echo > 0 ? 4 : 0
    const envelope = (t) => {
      let v = 0
      for (let i = 0; i <= echoes; i++) {
        const p = (t - i * echo) / STATIC_DURATION
        if (p < 0 || p > 1) continue
        v = Math.max(v, 0.45 ** i * (1 - p) * (1 - p))
      }
      return v
    }
    const total = STATIC_DURATION + echoes * echo
    gsap.fromTo(
      this.staticNoise,
      { value: 0 },
      {
        value: 1,
        duration: total,
        ease: 'none',
        overwrite: true,
        onUpdate: () => {
          this.markActivity()
          this.effect.setStatic(envelope(this.staticNoise.value * total))
        },
        onComplete: () => this.effect.setStatic(0),
      },
    )
  }

  setupEvents() {
    this.abort = new AbortController()
    const { signal } = this.abort
    window.addEventListener(
      'pointerdown',
      (e) => {
        audio.click()
        this.ripple(e.clientX, e.clientY)
      },
      { passive: true, signal },
    )
    window.addEventListener('keydown', (e) => this.onKeyDown(e), { signal })
    window.addEventListener('pointermove', () => (this.isPointerInside = true), { passive: true, signal })
    document.documentElement.addEventListener('pointerleave', () => (this.isPointerInside = false), { signal })
    if (this.isTouch && this.motion) this.setupDeviceTilt()

    if (this.footerCanvas) {
      this.footerObserver = new IntersectionObserver(([e]) => (this.isFooterVisible = e.isIntersecting), {
        rootMargin: '300px',
      })
      this.footerObserver.observe(this.footerCanvas)
    }

    this.offs = [
      bus('CANVAS:RIPPLE').on(({ x, y, power }) => this.ripple(x, y, power)),
      bus('LOADER:START').on(() => this.animateIn()),
      bus('CANVAS:ENTER').on((slug) => {
        this.currentShape = slug
        this.showShape(slug)
        this.setCharset(CHARSET_BY_SECTION[slug] ?? 0)
        if (slug === 'mail') this.isMagnet = true
      }),
      bus('CANVAS:LEAVE').on((slug) => {
        this.hideShape(slug)
        if (slug === 'mail') this.isMagnet = false
      }),
      bus('CANVAS:PROGRESS').on((slug, p) => {
        this.currentShape = slug
        this.progressShape(slug, p)
      }),
      bus('CANVAS:ENTER_OBJECT').on(() => {
        this.object?.load()
        this.object?.show()
        this.setCharset(0)
      }),
      bus('CANVAS:LEAVE_OBJECT').on(() => this.object?.hide()),
      bus('WORK:ENTER').on(() => audio.hover()),
    ]
  }

  showShape(slug) {
    this.currentShape = slug
    this.shapes.find((s) => s.slug === slug)?.show()
  }

  hideShape(slug) {
    this.currentShape = null
    this.shapes.find((s) => s.slug === slug)?.hide()
  }

  progressShape(slug, p) {
    if (slug === 'hero') return
    const shape = this.shapes.find((s) => s.slug === slug)
    if (slug === 'mail') shape?.setReveal(gsap.utils.clamp(0, 1, p / MAIL_REVEAL))
    else shape?.setProgress(p)
    // the light sweeps across the text while scrolling through the section
    const e = lightEase(p)
    const startX = slug === 'projects' && !this.isMobile ? PROJECTS_LIGHT_X : -1.2
    this.lightGroup.position.x = startX + e * (1.3 - startX)
    this.lightGroup.position.y = -1.2 + e * 2.5
    this.lightGroup.position.z = -2.2 + Math.sin(e * Math.PI) * 1.5
  }

  resize(w, h) {
    if (!w || !h) return
    this.width = w
    this.height = h
    const dpr = window.devicePixelRatio || 1
    this.dpr = dpr
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    const inset = (w / 1400) * 20
    if (this.footerCanvas) {
      const fw = Math.round(w - inset * 2)
      const fh = Math.round(h - inset * 2)
      this.footerCanvas.width = Math.round(fw * dpr)
      this.footerCanvas.height = Math.round(fh * dpr)
      this.footerCanvas.style.width = fw + 'px'
      this.footerCanvas.style.height = fh + 'px'
    }
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.effect.setSize(w, h)
    this.updateBreakpoint()
    this.markActivity()
    this.render()
  }

  checkSize() {
    const parent = this.canvas.parentElement
    const w = parent.clientWidth
    const h = parent.clientHeight
    const dpr = window.devicePixelRatio || 1
    if (w !== this.width || h !== this.height || dpr !== this.dpr) this.resize(w, h)
  }

  updateBreakpoint() {
    const mobile = this.width < 1024
    if (mobile === this.isMobile) return
    this.isMobile = mobile
    this.setupShapes()
    const s = mobile ? 0.4 : 1
    this.shapes.forEach((sh) => sh.root.scale.set(s, s, 1))
    if (this.currentShape) this.showShape(this.currentShape)
    if (mobile) this.object?.hide()
    else if (!this.object) this.setupObject()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.abort.abort()
    this.offs.forEach((off) => off())
    this.footerObserver?.disconnect()
    gsap.killTweensOf([this.melt, this.staticNoise])
    this.shapes.forEach((s) => s.dispose())
    this.object?.dispose()
    this.backgroundNoise.dispose()
    this.effect.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
