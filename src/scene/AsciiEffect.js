import * as THREE from 'three'

// glyph cell in the atlas (css px) and where the baseline sits in it
const CELL_W = 12
const CELL_H = 16
const ORIGIN_X = 1
const ORIGIN_Y = 12
const MAX_RIPPLES = 4
const MAX_TRAIL = 24
const RIPPLE_LIFE = 1.6 // s
const RIPPLE_SPEED = 900 // px/s
const SCALE = 0.2 // scene is rendered at 1/5 of the screen resolution

const vertexShader = /* glsl */ `
  attribute vec2 aCell;

  uniform sampler2D tScene;
  uniform vec2 uSceneSize;
  uniform vec2 uScreen;
  uniform vec2 uCell;
  uniform vec2 uCellOrigin;
  uniform float uInitialX;
  uniform float uCharSpace;
  uniform float uLineHeight;
  uniform float uMaxIdx;
  uniform float uCharCount;
  uniform float uCharsetCount;
  uniform float uCharsetFrom;
  uniform float uCharsetTo;
  uniform float uCharsetProgress;
  uniform float uInvert;
  uniform vec3 uPointer;
  uniform float uMagnet;
  uniform float uWobble;
  uniform float uMelt;
  uniform float uStatic;
  uniform vec2 uStaticKey;
  uniform float uStaticTone;
  uniform float uTime;
  uniform vec4 uRipples[${MAX_RIPPLES}];
  uniform vec3 uTrail[${MAX_TRAIL}];

  varying vec2 vUv;
  varying float vAlpha;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // only every other scene row becomes a line of characters
    float sceneRow = aCell.y * 2.0;
    vec2 st = vec2(
      (aCell.x + 0.5) / uSceneSize.x,
      (uSceneSize.y - 1.0 - sceneRow + 0.5) / uSceneSize.y
    );
    vec3 color = texture2D(tScene, st).rgb;
    float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float idx = floor((1.0 - brightness) * uMaxIdx);
    if (uInvert > 0.5) idx = uMaxIdx - idx;

    vec2 cellPos = vec2(uInitialX + aCell.x * uCharSpace, aCell.y * uLineHeight);
    vec2 offset = vec2(sin(cellPos.y * 0.02 + uTime * 5.0) * uWobble, 0.0);
    float boost = 0.0;

    // characters scatter away from a moving cursor (or get pulled in by the magnet)
    if (uPointer.z > 0.004) {
      vec2 d = cellPos - uPointer.xy;
      float len = length(d);
      float lensRadius = 160.0 + 40.0 * uPointer.z;
      if (len < lensRadius) {
        float f = 1.0 - len / lensRadius;
        f *= f;
        float push = mix(40.0, -55.0, uMagnet);
        offset += d * f * push * (6.75 / lensRadius) * uPointer.z;
      }
    }

    // fading wake behind the cursor
    float trailForce = 0.0;
    vec2 trailPush = vec2(0.0);
    for (int i = 0; i < ${MAX_TRAIL}; i++) {
      vec3 trail = uTrail[i];
      if (trail.z <= 0.0) continue;
      vec2 d = cellPos - trail.xy;
      float len = length(d);
      float radius = mix(40.0, 90.0, trail.z);
      if (len < radius) {
        float f = smoothstep(radius, 0.0, len) * trail.z;
        if (f > trailForce) {
          trailForce = f;
          trailPush = d / radius * (1.0 - len / radius);
        }
      }
    }
    offset += trailPush * trailForce * 48.0;

    // click shockwaves: a ring of denser characters pushing outwards
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 ripple = uRipples[i];
      if (ripple.w <= 0.0) continue;
      vec2 d = cellPos - ripple.xy;
      float len = max(length(d), 1.0);
      float band = (len - ripple.z) / 60.0;
      if (abs(band) < 1.0) {
        float wave = (1.0 - band * band) * ripple.w;
        offset += d / len * wave * 14.0;
        boost += wave * 5.0;
      }
    }

    // idle melt: columns drip down at their own pace, lower rows sag more
    if (uMelt > 0.0) {
      float column = hash(vec2(aCell.x, 7.0));
      float drip = (0.25 + 0.75 * column * column) * (0.3 + cellPos.y / uScreen.y);
      offset.y += uMelt * drip * 260.0;
      offset.x += sin(uTime * 2.0 + aCell.x * 0.3) * uMelt * 3.0;
    }

    vAlpha = 1.0;
    if (idx < 0.5 && boost > 0.0) {
      vAlpha = smoothstep(0.0, 1.0, boost);
      idx = min(uMaxIdx, ceil(boost));
    } else if (idx < 0.5 && trailForce > 0.0) {
      vAlpha = smoothstep(0.0, 0.45, trailForce);
      idx = 4.0;
    } else {
      idx = min(uMaxIdx, idx + floor(boost + 0.5));
    }

    // key press static: a flicker pattern per key, texture set by pitch
    if (uStatic > 0.0) {
      float tone = uStaticTone;
      float frame = floor(uTime * 24.0 * pow(2.0, tone));
      float grain = pow(2.0, -tone * 1.5);
      float style = uStaticKey.x;
      float seed = uStaticKey.y;
      vec2 cell = floor(aCell / grain);
      float mask = 1.0;
      if (style > 0.5 && style < 1.5) {
        mask = step(0.5, hash(vec2(cell.y, seed + frame)));
      } else if (style < 2.5 && style > 1.5) {
        mask = step(0.55, hash(vec2(floor(cell.x / 3.0), seed + frame)));
      } else if (style < 3.5 && style > 2.5) {
        mask = step(0.5, fract((cell.x + cell.y * 2.0) / 14.0 + frame * 0.15 + seed * 0.1));
      } else if (style < 4.5 && style > 3.5) {
        vec2 c = (cell - vec2(uSceneSize.x * 0.5, uSceneSize.y * 0.25) / grain) * vec2(1.0, 2.0);
        mask = step(0.5, fract(length(c) / 10.0 - frame * 0.2));
      } else if (style < 5.5 && style > 4.5) {
        mask = step(0.55, hash(floor(cell / vec2(8.0, 4.0)) + seed + frame));
      } else if (style > 5.5) {
        mask = mod(floor(cell.x / 6.0) + floor(cell.y / 3.0) + mod(frame, 2.0), 2.0);
      }
      if (mask > 0.5 && hash(cell + frame + seed) < uStatic * 0.75) {
        float low = clamp(1.0 + mod(seed, 3.0) * 5.0 - tone * 4.0, 1.0, uMaxIdx - 6.0);
        idx = min(uMaxIdx, low + floor(hash(cell * 1.7 + frame + seed) * 7.0));
        vAlpha = 1.0;
        offset.x += (hash(cell + frame + 3.1) - 0.5) * 6.0 * uStatic;
      }
    }

    // charset switch: each cell flips at its own random moment
    float charset = hash(aCell) < uCharsetProgress ? uCharsetTo : uCharsetFrom;
    vUv = vec2((idx + uv.x) / uCharCount, (charset + uv.y) / uCharsetCount);

    vec2 p = cellPos + offset - uCellOrigin + position.xy * uCell;
    gl_Position = vec4(p.x / uScreen.x * 2.0 - 1.0, 1.0 - p.y / uScreen.y * 2.0, 0.0, 1.0);
    // blank cells are pushed out of clip space
    if (idx < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D tAtlas;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    float alpha = texture2D(tAtlas, vUv).a * vAlpha;
    gl_FragColor = vec4(uColor * alpha, alpha);
  }
`

export class AsciiEffect {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {CanvasRenderingContext2D} ctx  visible 2d canvas the result is copied into
   * @param {string[]} charsets  density ramps, light -> dark
   */
  constructor(renderer, ctx, charsets, { theme = 'white', motion = true, strokes = [], font = 'andale-mono' } = {}) {
    this.renderer = renderer
    this.ctx = ctx
    this.theme = theme
    this.motion = motion
    this.strokes = strokes
    this.font = font
    this.dpr = window.devicePixelRatio || 1

    const len = charsets[0].length
    this.charsets = charsets.map((s) => s.padEnd(len, s[s.length - 1]).slice(0, len))
    this.charCount = len
    this.currentCharset = 0

    this.atlasCanvas = document.createElement('canvas')
    this.atlasCtx = this.atlasCanvas.getContext('2d')
    this.atlas = new THREE.CanvasTexture(this.atlasCanvas)
    this.atlas.flipY = false
    this.atlasFont = null

    this.ripples = []
    this.rippleUniforms = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4())
    this.trailUniforms = Array.from({ length: MAX_TRAIL }, () => new THREE.Vector3())
    this.sceneTarget = null
    this.origin = new THREE.Vector2(0, 0)

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tScene: { value: null },
        tAtlas: { value: this.atlas },
        uSceneSize: { value: new THREE.Vector2() },
        uScreen: { value: new THREE.Vector2() },
        uCell: { value: new THREE.Vector2(CELL_W, CELL_H) },
        uCellOrigin: { value: new THREE.Vector2(ORIGIN_X, ORIGIN_Y) },
        uInitialX: { value: 0 },
        uCharSpace: { value: 26 * SCALE },
        uLineHeight: { value: 50 * SCALE },
        uMaxIdx: { value: len - 1 },
        uCharCount: { value: len },
        uCharsetCount: { value: this.charsets.length },
        uCharsetFrom: { value: 0 },
        uCharsetTo: { value: 0 },
        uCharsetProgress: { value: 1 },
        uInvert: { value: 0 },
        uPointer: { value: new THREE.Vector3(-9999, -9999, 0) },
        uMagnet: { value: 0 },
        uWobble: { value: 0 },
        uMelt: { value: 0 },
        uStatic: { value: 0 },
        uStaticKey: { value: new THREE.Vector2() },
        uStaticTone: { value: 0 },
        uTime: { value: 0 },
        uRipples: { value: this.rippleUniforms },
        uTrail: { value: this.trailUniforms },
        uColor: { value: new THREE.Color() },
      },
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.u = this.material.uniforms

    // one instanced quad per character cell
    this.geometry = new THREE.InstancedBufferGeometry()
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], 3))
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2))
    this.geometry.setIndex([0, 2, 1, 2, 3, 1])
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.quadScene = new THREE.Scene()
    this.quadScene.add(this.mesh)
    this.quadCamera = new THREE.OrthographicCamera()
  }

  // ── setters driven by the scene ───────────────────────────
  setTheme(t) {
    this.theme = t
  }
  setFont(f) {
    this.font = f
    this.atlasFont = null
  }
  setPointer(x, y, amount) {
    this.u.uPointer.value.set(x, y, this.motion ? amount : 0)
  }
  setMagnet(v) {
    this.u.uMagnet.value = v
  }
  setTrail(head, trail) {
    for (let i = 0; i < MAX_TRAIL; i++) {
      const p = this.motion && (i ? trail[i - 1] : head)
      if (p) this.trailUniforms[i].set(p.x, p.y, p.strength)
      else this.trailUniforms[i].z = 0
    }
  }
  setScrollVelocity(v) {
    this.u.uWobble.value = this.motion ? v : 0
  }
  setMelt(v) {
    this.u.uMelt.value = this.motion ? v : 0
  }
  setStatic(v) {
    this.u.uStatic.value = this.motion ? v : 0
  }
  setStaticKey(key) {
    const code = key.toLowerCase().codePointAt(0) || 0
    this.u.uStaticKey.value.set(code % 7, code)
  }
  setStaticTone(v) {
    this.u.uStaticTone.value = v
  }
  /** returns the progress uniform to tween 0 -> 1, or null if unchanged */
  setCharset(index) {
    if (index === this.currentCharset) return null
    const p = this.u.uCharsetProgress.value
    this.u.uCharsetFrom.value = p < 0.5 ? this.u.uCharsetFrom.value : this.currentCharset
    this.u.uCharsetTo.value = index
    this.u.uCharsetProgress.value = 0
    this.currentCharset = index
    return this.u.uCharsetProgress
  }
  addRipple(x, y, power = 1) {
    if (!this.motion) return
    this.ripples.push({ x, y, power, start: performance.now() })
    if (this.ripples.length > MAX_RIPPLES) this.ripples.shift()
  }
  hasActiveRipples() {
    return this.ripples.length > 0
  }

  setSize(width, height) {
    this.width = width
    this.height = height
    this.cols = Math.ceil(width * SCALE)
    this.sceneRows = Math.ceil(height * SCALE)
    const dpr = window.devicePixelRatio || 1
    if (dpr !== this.dpr) {
      this.dpr = dpr
      this.atlasFont = null
    }
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(width, height, false)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    this.sceneTarget?.dispose()
    this.sceneTarget = new THREE.FramebufferTexture(this.cols, this.sceneRows)
    this.u.tScene.value = this.sceneTarget
    this.u.uSceneSize.value.set(this.cols, this.sceneRows)
    this.u.uScreen.value.set(width, height)
    this.u.uInitialX.value = (-width * SCALE) / 10

    const rows = Math.ceil(this.sceneRows / 2)
    const attr = this.geometry.getAttribute('aCell')
    if (!(attr && attr.count === this.cols * rows && this.rows === rows)) {
      this.rows = rows
      const cells = new Float32Array(this.cols * rows * 2)
      for (let y = 0, k = 0; y < rows; y++) for (let x = 0; x < this.cols; x++, k += 2) {
        cells[k] = x
        cells[k + 1] = y
      }
      if (attr) this.geometry.deleteAttribute('aCell')
      this.geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2))
      this.geometry.instanceCount = this.cols * rows
    }
  }

  drawAtlas() {
    const font = `10px ${this.font}`
    if (!document.fonts.check(font)) document.fonts.load(font).then(() => (this.atlasFont = null))
    const c = this.atlasCanvas
    const ctx = this.atlasCtx
    c.width = CELL_W * this.charCount * this.dpr
    c.height = CELL_H * this.charsets.length * this.dpr
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.font = font
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'white'
    ctx.lineJoin = 'round'
    this.charsets.forEach((set, row) => {
      const stroke = this.strokes[row] || 0
      ctx.lineWidth = stroke
      for (let i = 0; i < set.length; i++) {
        const x = i * CELL_W + ORIGIN_X
        const y = row * CELL_H + ORIGIN_Y
        ctx.fillText(set[i], x, y)
        if (stroke) ctx.strokeText(set[i], x, y)
      }
    })
    this.atlas.needsUpdate = true
    this.atlasFont = this.font
  }

  updateRipples(now) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if ((now - this.ripples[i].start) * 0.001 > RIPPLE_LIFE) this.ripples.splice(i, 1)
    }
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const r = this.ripples[i]
      if (!r) {
        this.rippleUniforms[i].w = 0
        continue
      }
      const age = (now - r.start) * 0.001
      const life = 1 - age / RIPPLE_LIFE
      this.rippleUniforms[i].set(r.x, r.y, age * RIPPLE_SPEED, life * life * r.power)
    }
  }

  render(scene, camera) {
    if (this.atlasFont !== this.font) this.drawAtlas()
    const now = performance.now()
    this.u.uTime.value = now * 0.001
    this.u.uColor.value.set(this.theme === 'white' ? 0x000000 : 0xffffff)
    this.updateRipples(now)

    const r = this.renderer
    // 1. render the 3D scene tiny, grab it as a texture
    r.setScissorTest(true)
    r.setViewport(0, 0, this.cols / this.dpr, this.sceneRows / this.dpr)
    r.setScissor(0, 0, this.cols / this.dpr, this.sceneRows / this.dpr)
    r.setClearColor(0xffffff, 1)
    r.render(scene, camera)
    r.copyFramebufferToTexture(this.sceneTarget, this.origin)
    r.setScissorTest(false)
    // 2. render one glyph per cell at full size
    r.setViewport(0, 0, this.width, this.height)
    r.setClearColor(0x000000, 0)
    r.render(this.quadScene, this.quadCamera)
    // 3. copy into the visible canvas
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.ctx.drawImage(r.domElement, 0, 0, this.width, this.height)
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.atlas.dispose()
    this.sceneTarget?.dispose()
  }
}
