import * as THREE from 'three'
import gsap from 'gsap'

export const DISPLAY_FONT = "'Roboto Flex', 'Arial Narrow', Arial, sans-serif"

/**
 * Renders lines of big condensed text into a canvas: white glyphs on black,
 * ready to be used as an alphaMap.
 */
export function makeTextTexture(lines, { width = 1400, lineHeight = 0.86, maxRatio = 0.9 } = {}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const setFont = (size) => {
    ctx.font = `800 ${size}px ${DISPLAY_FONT}`
    if ('fontStretch' in ctx) ctx.fontStretch = 'extra-condensed'
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-size * 0.02}px`
  }

  // fit the widest line to the canvas width
  setFont(100)
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
  let size = (100 * width * 0.98) / widest
  // keep very short words (monograms) from getting taller than wide
  const maxSize = (width * maxRatio) / (lines.length * lineHeight)
  size = Math.min(size, maxSize)
  setFont(size)

  const m = ctx.measureText('Hg')
  const ascent = m.actualBoundingBoxAscent || size * 0.75
  const descent = m.actualBoundingBoxDescent || size * 0.2
  const lh = size * lineHeight
  const height = Math.ceil(ascent + descent + lh * (lines.length - 1) + size * 0.08)

  canvas.width = width
  canvas.height = height
  setFont(size) // resizing resets the context
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  lines.forEach((line, i) => ctx.fillText(line, width / 2, size * 0.04 + ascent + i * lh))

  const texture = new THREE.CanvasTexture(canvas)
  return { texture, width, height }
}

// ── big text planes: hero monogram, "Selected projects", "Let's talk" ──
const SHAPE_Z = -3
const HIDDEN_Z = -33

export class TextShape {
  constructor({ slug, lines, isMobile }) {
    this.slug = slug
    this.isMobile = isMobile
    this.root = new THREE.Group()
    this.root.position.z = HIDDEN_Z
    this.reveal = null

    const { texture, width, height } = makeTextTexture(lines)
    this.texture = texture
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      metalness: 0.8,
      roughness: 0.5,
      transparent: true,
      side: THREE.DoubleSide,
      alphaMap: texture,
      opacity: 1,
    })
    const unit = window.innerWidth > 1024 ? 450 : 650
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width / unit, height / unit), this.material)
    this.root.add(this.mesh)
  }

  show() {
    this.root.position.z = SHAPE_Z
    gsap.killTweensOf(this.material)
    if (this.reveal === null) {
      gsap.fromTo(this.material, { opacity: 0 }, { opacity: 1, ease: 'power3.out', duration: 1, overwrite: 'all' })
    } else {
      this.material.opacity = this.reveal
    }
  }

  hide() {
    gsap.killTweensOf(this.material)
    gsap.to(this.material, { opacity: 0, ease: 'power3.out', duration: 1, overwrite: 'all' }).then(() => {
      this.root.position.z = HIDDEN_Z
    })
  }

  // intro zoom: starts 10x and settles
  animateIn() {
    const s = window.innerWidth < 1024 ? 0.4 : 1
    gsap.fromTo(this.root.scale, { x: 10, y: 10 }, { x: s, y: s, duration: 6, ease: 'power3.out' })
  }

  setReveal(v) {
    this.reveal = v
    gsap.killTweensOf(this.material)
    this.root.position.z = SHAPE_Z
    this.material.opacity = v
  }

  setProgress(p) {
    this.root.position.y = -0.75 + p
  }

  dispose() {
    gsap.killTweensOf(this.material)
    gsap.killTweensOf(this.root.scale)
    this.mesh.geometry.dispose()
    this.texture.dispose()
    this.material.dispose()
  }
}

// ── rotating 3D ornament next to the introduction text ──
const OBJECT_Z = -3
const ORNAMENT_SIZE = 1
const ORNAMENT_SLICES = 12
const ORNAMENT_DEPTH = 0.09

/**
 * Turns an ornament image into a white-on-black mask texture.
 * Transparent PNGs use their alpha; opaque ones use inverted luminance
 * (dark ornament on a light background).
 */
function loadOrnamentMask(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const scale = Math.min(1, 512 / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h)
      const px = data.data
      let transparent = 0
      for (let i = 3; i < px.length; i += 4) if (px[i] < 250) transparent++
      const useAlpha = transparent > px.length / 4 / 50
      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
        const v = useAlpha ? px[i + 3] : 255 - lum
        px[i] = px[i + 1] = px[i + 2] = v
        px[i + 3] = 255
      }
      ctx.putImageData(data, 0, 0)
      const texture = new THREE.CanvasTexture(canvas)
      resolve({ texture, aspect: w / h })
    }
    img.onerror = reject
    img.src = url
  })
}

export class FloatingObject {
  constructor(ornaments = []) {
    this.root = new THREE.Group()
    this.root.position.set(-0.75, 0, -33)
    this.ornaments = ornaments
    this.masks = []
    this.current = -1
    this.model = null
    this.loading = null
  }

  load() {
    if (this.loading || !this.ornaments.length) return
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.45,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    })
    this.geometry = new THREE.PlaneGeometry(1, 1)
    this.model = new THREE.Group()
    for (let i = 0; i < ORNAMENT_SLICES; i++) {
      const slice = new THREE.Mesh(this.geometry, this.material)
      slice.position.z = (i / (ORNAMENT_SLICES - 1) - 0.5) * ORNAMENT_DEPTH
      this.model.add(slice)
    }
    this.model.visible = false
    this.root.add(this.model)
    this.loading = Promise.all(this.ornaments.map((url) => loadOrnamentMask(url).catch(() => null))).then((masks) => {
      this.masks = masks.filter(Boolean)
      if (this.current < 0) this.next()
    })
  }

  // swap to the next ornament (called every time the object comes in)
  next() {
    if (!this.masks.length || !this.model) return
    this.current = (this.current + 1) % this.masks.length
    const { texture, aspect } = this.masks[this.current]
    this.material.alphaMap = texture
    this.material.needsUpdate = true
    const w = aspect >= 1 ? ORNAMENT_SIZE : ORNAMENT_SIZE * aspect
    const h = aspect >= 1 ? ORNAMENT_SIZE / aspect : ORNAMENT_SIZE
    this.model.scale.set(w, h, 1)
    this.model.visible = true
  }

  tick() {
    if (this.model) {
      this.model.rotation.y += 0.006
      this.model.rotation.z += 0.0025
    }
  }

  tilt(x, y) {
    this.root.rotation.y += (x * 0.9 - this.root.rotation.y) * 0.08
    this.root.rotation.x += (y * 0.5 - this.root.rotation.x) * 0.08
  }

  show() {
    if (this.root.position.z < -10) this.next()
    gsap.killTweensOf(this.root.position)
    gsap.fromTo(this.root.position, { z: -4.4 }, { z: OBJECT_Z, ease: 'back.out(2)', duration: 0.9, overwrite: 'all' })
  }

  hide() {
    gsap.killTweensOf(this.root.position)
    gsap.to(this.root.position, { z: -4.4, ease: 'power1.out', duration: 0.4 }).then(() => {
      this.root.position.z = -33
    })
  }

  dispose() {
    this.geometry?.dispose()
    this.material?.dispose()
    this.masks.forEach((m) => m.texture.dispose())
  }
}

// ── hero: small ornaments drifting across the screen ──
const DRIFT_Z = -3
const DRIFT_HIDDEN_Z = -33

export class DriftingOrnaments {
  constructor(ornaments = [], { count = 16 } = {}) {
    this.root = new THREE.Group()
    this.root.position.z = DRIFT_HIDDEN_Z
    this.count = count
    this.items = []
    this.materials = []
    this.started = false
    this.visible = false
    this.fade = { value: 0 }
    this.last = performance.now()
    this.geometry = new THREE.PlaneGeometry(1, 1)
    this.ready = Promise.all(ornaments.map((url) => loadOrnamentMask(url).catch(() => null))).then((masks) => {
      masks = masks.filter(Boolean)
      if (!masks.length) return
      this.materials = masks.map(
        ({ texture }) =>
          // dark material -> dense glyphs (the ascii ramp maps dark to ▓█)
          new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.4,
            roughness: 0.6,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            alphaMap: texture,
          }),
      )
      for (let i = 0; i < this.count; i++) {
        const m = i % masks.length
        const mesh = new THREE.Mesh(this.geometry, this.materials[m])
        const size = 0.17 + Math.random() * 0.13
        const { aspect } = masks[m]
        const item = {
          mesh,
          w: aspect >= 1 ? size : size * aspect,
          h: aspect >= 1 ? size / aspect : size,
          // spread start positions over the whole width so the screen is filled at once
          u: i / this.count + Math.random() * 0.05,
          v: Math.random(),
          speed: (0.012 + Math.random() * 0.02) * (Math.random() < 0.25 ? -1 : 1),
          bob: 0.02 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.6,
          wobble: 0.15 + Math.random() * 0.3,
          z: (Math.random() - 0.5) * 0.4,
          pop: 0,
        }
        mesh.scale.set(0.0001, 0.0001, 1)
        mesh.rotation.z = Math.random() * Math.PI * 2
        this.root.add(mesh)
        this.items.push(item)
      }
      if (this.started) this.popIn()
    })
  }

  // after the loader: ornaments appear one by one
  animateIn() {
    this.started = true
    this.show()
    this.popIn()
  }

  popIn() {
    this.items.forEach((it, i) => {
      gsap.fromTo(it, { pop: 0 }, { pop: 1, duration: 1.4, ease: 'back.out(2.2)', delay: 0.15 + i * 0.09 })
    })
  }

  show() {
    this.visible = true
    if (!this.started) return
    this.root.position.z = DRIFT_Z
    gsap.to(this.fade, { value: 1, duration: 1, ease: 'power3.out', overwrite: 'all' })
  }

  hide() {
    this.visible = false
    gsap.to(this.fade, {
      value: 0,
      duration: 0.8,
      ease: 'power3.out',
      overwrite: 'all',
      onComplete: () => {
        if (!this.visible) this.root.position.z = DRIFT_HIDDEN_Z
      },
    })
  }

  /** @param {THREE.PerspectiveCamera} camera */
  tick(camera) {
    const now = performance.now()
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    if (!this.items.length || this.root.position.z === DRIFT_HIDDEN_Z) return

    // visible area at the drift depth
    const viewH = 2 * Math.abs(DRIFT_Z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const viewW = viewH * camera.aspect
    const span = viewW + 0.6
    const t = now / 1000

    for (const it of this.items) {
      it.u += (it.speed * dt * 3) / span
      if (it.u > 1) {
        it.u -= 1
        it.v = Math.random()
      } else if (it.u < 0) {
        it.u += 1
        it.v = Math.random()
      }
      const m = it.mesh
      m.position.x = -span / 2 + it.u * span
      m.position.y = (it.v - 0.5) * viewH * 0.9 + Math.sin(t * 0.6 + it.phase) * it.bob
      m.position.z = it.z
      m.rotation.z += it.spin * dt
      m.rotation.y = Math.sin(t * 0.5 + it.phase) * it.wobble
      const s = Math.max(0.0001, it.pop)
      m.scale.set(it.w * s, it.h * s, 1)
    }
    for (const mat of this.materials) mat.opacity = this.fade.value
  }

  dispose() {
    this.items.forEach((it) => gsap.killTweensOf(it))
    gsap.killTweensOf(this.fade)
    this.geometry.dispose()
    this.materials.forEach((m) => {
      m.alphaMap?.dispose()
      m.dispose()
    })
  }
}

// ── typed letters: a glyph pops in the scene with optional echoes ──
const LETTER_Z = -2.6
const ECHOES = 4
const ECHO_FEEDBACK = 0.45
const letterTextures = new Map()
const letterGeometry = new THREE.PlaneGeometry(1, 1)

export class Letter {
  static play(parent, char, { tone = 0, echo = 0 } = {}) {
    const first = new Letter(parent, char, { tone })
    if (echo <= 0) return
    for (let i = 1; i <= ECHOES; i++) {
      gsap.delayedCall(i * echo, () => {
        new Letter(parent, char, {
          tone,
          level: ECHO_FEEDBACK ** i,
          position: first.mesh.position,
          rotation: first.mesh.rotation.z + i * 0.06,
          drift: i,
        })
      })
    }
  }

  static getTexture(char) {
    if (!letterTextures.has(char)) {
      const c = document.createElement('canvas')
      c.width = c.height = 256
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, 256, 256)
      ctx.fillStyle = '#fff'
      ctx.font = `800 220px ${DISPLAY_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(char, 128, 140)
      letterTextures.set(char, new THREE.CanvasTexture(c))
    }
    return letterTextures.get(char)
  }

  constructor(parent, char, { tone = 0, level = 1, position, rotation, drift = 0 } = {}) {
    this.parent = parent
    this.level = level
    this.size = 2 ** (-tone * 0.6)
    this.speed = 2 ** (tone * 0.6)
    // "difference" blending: the glyph inverts whatever is behind it
    this.material = new THREE.MeshBasicMaterial({
      map: Letter.getTexture(char),
      color: 0xffffff,
      transparent: true,
      fog: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneMinusDstColorFactor,
      blendDst: THREE.OneMinusSrcColorFactor,
    })
    this.mesh = new THREE.Mesh(letterGeometry, this.material)
    if (position) {
      this.mesh.position.set(position.x + drift * 0.04, position.y - drift * 0.02, LETTER_Z)
      this.mesh.rotation.z = rotation
    } else {
      this.mesh.position.set((Math.random() - 0.5) * 0.9, tone * 0.15 + (Math.random() - 0.5) * 0.25, LETTER_Z)
      this.mesh.rotation.z = (Math.random() - 0.5) * 0.5
    }
    this.mesh.renderOrder = 2
    parent.add(this.mesh)
    this.animate()
  }

  animate() {
    const from = 0.4 * this.size
    const to = 1.1 * this.size
    gsap.fromTo(this.mesh.scale, { x: from, y: from }, { x: to, y: to, duration: 1.1 / this.speed, ease: 'power3.out' })
    const c = { value: this.level }
    this.material.color.setScalar(c.value)
    gsap.to(c, {
      value: 0,
      duration: 0.6 / this.speed,
      delay: 0.5 / this.speed,
      ease: 'power1.in',
      onUpdate: () => this.material.color.setScalar(c.value),
      onComplete: () => this.dispose(),
    })
  }

  dispose() {
    this.parent.remove(this.mesh)
    this.material.dispose()
  }
}

// ── slow perlin blotches far behind everything ──
const noiseVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const noiseFragment = /* glsl */ `
  precision highp float;
  uniform float time;
  varying vec2 vUv;

  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

  float cnoise(vec2 P) {
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod289(Pi);
    vec4 ix = Pi.xzxz;
    vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz;
    vec4 fy = Pf.yyww;
    vec4 i = permute(permute(ix) + iy);
    vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x, gy.x);
    vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z);
    vec2 g11 = vec2(gx.w, gy.w);
    vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
    g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
  }

  void main() {
    float noise = cnoise(vUv * .1 + time * .5) * 100.;
    float opacity = cnoise(vUv * .2 - time * .2) * noise * 5.;
    gl_FragColor = vec4(vec3(noise), opacity * .0025);
  }
`

export class BackgroundNoise {
  constructor(scene) {
    this.scene = scene
    this.material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: noiseVertex,
      fragmentShader: noiseFragment,
      transparent: true,
    })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 1, 1), this.material)
    this.mesh.position.set(0, 0, -15)
    scene.add(this.mesh)
  }
  update() {
    this.material.uniforms.time.value += 0.005
  }
  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
    this.scene.remove(this.mesh)
  }
}
