// WebAudio synth: UI clicks/blips + a 10-instrument keyboard
// (type to play · 1-0 instrument · ↑↓ pitch · ←→ echo)

const STORAGE_KEY = 'sound-enabled'
const MAX_SEMITONES = 24
const MAX_ECHO = 1
const ECHO_STEP = 0.08
const FEEDBACK = 0.45
const INSTRUMENTS = ['synth', 'piano', 'drums', 'guitar', 'organ', 'trumpet', 'violin', 'flute', 'bass', 'marimba']

class Audio {
  constructor() {
    this.enabled = true
    this.ctx = null
    this.noise = null
    this.output = null
    this.delay = null
    this.wet = null
    this.semitones = 0
    this.echo = 0
    this.instrument = 0
    this.lastChar = 'a'
    try {
      this.enabled = localStorage.getItem(STORAGE_KEY) !== '0'
    } catch {}
  }

  setEnabled(v) {
    this.enabled = v
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
    } catch {}
    if (v) this.blip({ pitch: 1.6 })
  }

  ensureContext() {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      const len = this.ctx.sampleRate * 0.2
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

      this.output = this.ctx.createGain()
      this.delay = this.ctx.createDelay(MAX_ECHO)
      this.delay.delayTime.value = this.echo
      const feedback = this.ctx.createGain()
      feedback.gain.value = FEEDBACK
      this.wet = this.ctx.createGain()
      this.wet.gain.value = this.echo > 0 ? 0.5 : 0
      this.output.connect(this.ctx.destination)
      this.output.connect(this.delay)
      this.delay.connect(feedback).connect(this.delay)
      this.delay.connect(this.wet).connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  get pitch() {
    return 2 ** (this.semitones / 12)
  }
  get tone() {
    return this.semitones / MAX_SEMITONES
  }

  shiftPitch(dir) {
    this.semitones = Math.max(-24, Math.min(MAX_SEMITONES, this.semitones + dir * 2))
    this.key(this.lastChar)
  }

  shiftEcho(dir) {
    const next = this.echo + dir * ECHO_STEP
    this.echo = next < ECHO_STEP / 2 ? 0 : Math.min(MAX_ECHO, next)
    const ctx = this.ensureContext()
    if (ctx) {
      const t = ctx.currentTime
      this.delay.delayTime.setTargetAtTime(Math.max(this.echo, 0.001), t, 0.05)
      this.wet.gain.setTargetAtTime(this.echo > 0 ? 0.5 : 0, t, 0.05)
    }
    this.key(this.lastChar)
  }

  click({ pitch = 1, volume = 0.18, decay = 0.05 } = {}) {
    if (!this.enabled) return
    const ctx = this.ensureContext()
    if (!ctx) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1800 * pitch * this.pitch * (0.9 + Math.random() * 0.2)
    filter.Q.value = 4
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(1e-4, t + decay)
    src.connect(filter).connect(gain).connect(this.output)
    src.start(t)
    src.stop(t + decay + 0.02)
  }

  blip({ pitch = 1, volume = 0.06, decay = 0.12 } = {}) {
    if (!this.enabled) return
    const ctx = this.ensureContext()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520 * pitch * this.pitch, t)
    osc.frequency.exponentialRampToValueAtTime(380 * pitch * this.pitch, t + decay)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(1e-4, t + decay)
    osc.connect(gain).connect(this.output)
    osc.start(t)
    osc.stop(t + decay + 0.02)
  }

  setInstrument(key) {
    const i = (Number(key) + 9) % 10
    if (INSTRUMENTS[i]) {
      this.instrument = i
      this.key(this.lastChar)
    }
  }

  get instrumentName() {
    return INSTRUMENTS[this.instrument]
  }

  key(char = '') {
    if (!this.enabled) return
    const ctx = this.ensureContext()
    if (!ctx) return
    this.lastChar = char
    const scale = [0, 2, 3, 5, 7, 8, 10]
    const c = char.toLowerCase()
    let i
    if (c >= 'a' && c <= 'z') i = c.charCodeAt(0) - 97
    else if (c >= '0' && c <= '9') i = 26 + Number(c)
    else i = Math.floor(Math.random() * 26)
    const freq = 110 * 2 ** ((scale[i % 7] + 12 * Math.floor(i / 7)) / 12) * this.pitch
    this[this.instrumentName](ctx, freq, ctx.currentTime, i)
  }

  // ── building blocks ───────────────────────────────────────
  envelope(ctx, t, { peak, attack = 0.01, end }) {
    const g = ctx.createGain()
    g.gain.setValueAtTime(1e-4, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(1e-4, t + end)
    return g
  }

  lfo(ctx, t, { rate, depth, delay = 0, end, targets }) {
    const osc = ctx.createOscillator()
    osc.frequency.value = rate
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(depth, t + delay + 0.1)
    osc.connect(g)
    targets.forEach((p) => g.connect(p))
    osc.start(t)
    osc.stop(t + end)
  }

  oscillator(ctx, t, { type = 'sine', frequency, detune = 0, end, into }) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, t)
    osc.detune.setValueAtTime(detune, t)
    osc.connect(into)
    osc.start(t)
    osc.stop(t + end + 0.05)
    return osc
  }

  noiseBurst(ctx, t, { type, frequency, Q = 1, volume, decay }) {
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = frequency
    f.Q.value = Q
    const g = ctx.createGain()
    g.gain.setValueAtTime(volume, t)
    g.gain.exponentialRampToValueAtTime(1e-4, t + decay)
    src.connect(f).connect(g).connect(this.output)
    src.start(t)
    src.stop(t + decay + 0.02)
  }

  level(ctx, value, into) {
    const g = ctx.createGain()
    g.gain.value = value
    g.connect(into)
    return g
  }

  // ── instruments ───────────────────────────────────────────
  synth(ctx, f, t) {
    const end = 0.45
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 8
    filter.frequency.setValueAtTime(f * 2, t)
    filter.frequency.exponentialRampToValueAtTime(f * 12, t + 0.03)
    filter.frequency.exponentialRampToValueAtTime(f * 1.5, t + end)
    const env = this.envelope(ctx, t, { peak: 0.07, end })
    filter.connect(env).connect(this.output)
    this.oscillator(ctx, t, { type: 'sawtooth', frequency: f, detune: -7, end, into: filter })
    this.oscillator(ctx, t, { type: 'square', frequency: f, detune: 7, end, into: filter })
  }

  piano(ctx, f, t) {
    const end = 1.6
    ;[1, 2, 3, 4].forEach((h, i) => {
      const env = this.envelope(ctx, t, { peak: 0.09 / h ** 1.4, attack: 0.004, end: end / (1 + i * 0.7) })
      env.connect(this.output)
      this.oscillator(ctx, t, { type: i ? 'sine' : 'triangle', frequency: f * h, detune: i * 1.5, end, into: env })
    })
    this.noiseBurst(ctx, t, { type: 'lowpass', frequency: f * 4, volume: 0.03, decay: 0.03 })
  }

  drums(ctx, f, t, index) {
    const kind = index % 4
    if (kind === 0) {
      const env = this.envelope(ctx, t, { peak: 0.35, attack: 0.002, end: 0.4 })
      env.connect(this.output)
      this.oscillator(ctx, t, { frequency: 150, end: 0.4, into: env }).frequency.exponentialRampToValueAtTime(42, t + 0.15)
    } else if (kind === 1) {
      this.noiseBurst(ctx, t, { type: 'highpass', frequency: 1500, volume: 0.22, decay: 0.18 })
      const env = this.envelope(ctx, t, { peak: 0.12, attack: 0.002, end: 0.1 })
      env.connect(this.output)
      this.oscillator(ctx, t, { type: 'triangle', frequency: 190, end: 0.1, into: env })
    } else if (kind === 2) {
      this.noiseBurst(ctx, t, { type: 'highpass', frequency: 7000, volume: 0.12, decay: 0.05 })
    } else {
      const base = 80 + (f % 160)
      const env = this.envelope(ctx, t, { peak: 0.25, attack: 0.002, end: 0.35 })
      env.connect(this.output)
      this.oscillator(ctx, t, { frequency: base * 1.6, end: 0.35, into: env }).frequency.exponentialRampToValueAtTime(base, t + 0.08)
    }
  }

  guitar(ctx, f, t) {
    // Karplus–Strong plucked string
    const end = 1.8
    const rate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, Math.floor(rate * end), rate)
    const data = buffer.getChannelData(0)
    const period = Math.max(2, Math.round(rate / f))
    const ring = new Float32Array(period).map(() => Math.random() * 2 - 1)
    for (let i = 0; i < data.length; i++) {
      const k = i % period
      const next = ring[(k + 1) % period]
      data[i] = ring[k]
      ring[k] = (ring[k] + next) * 0.497
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 5000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.12, t)
    g.gain.setTargetAtTime(1e-4, t + end - 0.3, 0.08)
    src.connect(lp).connect(g).connect(this.output)
    src.start(t)
  }

  organ(ctx, f, t) {
    const end = 0.7
    const g = ctx.createGain()
    g.gain.setValueAtTime(1e-4, t)
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.015)
    g.gain.setValueAtTime(0.06, t + end - 0.12)
    g.gain.exponentialRampToValueAtTime(1e-4, t + end)
    g.connect(this.output)
    const levels = [0.6, 1, 0.5, 0.7, 0.35, 0.3]
    const oscs = [0.5, 1, 1.5, 2, 3, 4].map((h, i) =>
      this.oscillator(ctx, t, { frequency: f * h, end, into: this.level(ctx, levels[i], g) }),
    )
    this.lfo(ctx, t, { rate: 6.5, depth: 6, end, targets: oscs.map((o) => o.detune) })
  }

  trumpet(ctx, f, t) {
    const end = 0.65
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 2
    filter.frequency.setValueAtTime(f * 1.2, t)
    filter.frequency.exponentialRampToValueAtTime(f * 7, t + 0.07)
    filter.frequency.exponentialRampToValueAtTime(f * 3, t + end)
    const env = this.envelope(ctx, t, { peak: 0.06, attack: 0.04, end })
    filter.connect(env).connect(this.output)
    const osc = this.oscillator(ctx, t, { type: 'sawtooth', frequency: f * 2, detune: -60, end, into: filter })
    osc.detune.linearRampToValueAtTime(0, t + 0.06)
    this.lfo(ctx, t, { rate: 5.5, depth: 12, delay: 0.15, end, targets: [osc.detune] })
  }

  violin(ctx, f, t) {
    const end = 1.1
    const peak = ctx.createBiquadFilter()
    peak.type = 'peaking'
    peak.frequency.value = 2800
    peak.Q.value = 1.5
    peak.gain.value = 6
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = Math.min(f * 2 * 8, 9000)
    const env = this.envelope(ctx, t, { peak: 0.045, attack: 0.18, end })
    lp.connect(peak).connect(env).connect(this.output)
    const oscs = [-5, 5].map((d) => this.oscillator(ctx, t, { type: 'sawtooth', frequency: f * 2, detune: d, end, into: lp }))
    this.lfo(ctx, t, { rate: 5.8, depth: 18, delay: 0.25, end, targets: oscs.map((o) => o.detune) })
  }

  flute(ctx, f, t) {
    const end = 0.8
    const freq = f * 4
    const env = this.envelope(ctx, t, { peak: 0.07, attack: 0.06, end })
    env.connect(this.output)
    const osc = this.oscillator(ctx, t, { frequency: freq, end, into: env })
    this.oscillator(ctx, t, { type: 'triangle', frequency: freq, end, into: this.level(ctx, 0.25, env) })
    this.lfo(ctx, t, { rate: 5, depth: 10, delay: 0.2, end, targets: [osc.detune] })
    this.noiseBurst(ctx, t, { type: 'bandpass', frequency: freq, Q: 3, volume: 0.025, decay: end * 0.6 })
  }

  bass(ctx, f, t) {
    const end = 0.6
    const freq = f / 2
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 4
    filter.frequency.setValueAtTime(freq * 10, t)
    filter.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.15)
    const env = this.envelope(ctx, t, { peak: 0.16, attack: 0.005, end })
    filter.connect(env).connect(this.output)
    this.oscillator(ctx, t, { type: 'sawtooth', frequency: freq, end, into: filter })
    this.oscillator(ctx, t, { frequency: freq, end, into: filter })
  }

  marimba(ctx, f, t) {
    const freq = f * 2
    ;[
      [1, 0.12, 0.7],
      [4, 0.03, 0.12],
      [9.9, 0.012, 0.05],
    ].forEach(([h, peak, end]) => {
      const env = this.envelope(ctx, t, { peak, attack: 0.003, end })
      env.connect(this.output)
      this.oscillator(ctx, t, { frequency: freq * h, end, into: env })
    })
  }

  // ── UI sounds ─────────────────────────────────────────────
  hover() {
    this.blip({ pitch: 1 + Math.random() * 0.3, volume: 0.035, decay: 0.08 })
  }
  whoosh() {
    this.click({ pitch: 0.35, volume: 0.22, decay: 0.35 })
  }
  chime() {
    this.blip({ pitch: 1.5, volume: 0.07, decay: 0.18 })
    setTimeout(() => this.blip({ pitch: 2, volume: 0.06, decay: 0.25 }), 90)
  }
}

export const audio = new Audio()
