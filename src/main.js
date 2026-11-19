import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { content } from './content.js'
import { bus } from './bus.js'
import { store } from './store.js'
import { audio } from './audio.js'
import { runLoader } from './loader.js'
import { pixelTransition } from './theme.js'
import { scrambleText, fallingLetters, revealLines } from './text.js'

gsap.registerPlugin(ScrollTrigger)

const $ = (s, root = document) => root.querySelector(s)
const $$ = (s, root = document) => [...root.querySelectorAll(s)]
const NBSP7 = '&nbsp;'.repeat(7)
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

history.scrollRestoration = 'manual'
document.title = `${content.name} - ${content.role}`

// ── smooth scroll ───────────────────────────────────────────
const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((t) => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)

// ── static content ──────────────────────────────────────────
$$('[data-content]').forEach((el) => (el.textContent = content[el.dataset.content]))
$$('[data-content-href]').forEach((el) => (el.href = `mailto:${content[el.dataset.contentHref]}`))

// ── header ──────────────────────────────────────────────────
const soundBtn = $('.nav-sound')
const syncSound = () => {
  soundBtn.setAttribute('aria-pressed', String(audio.enabled))
  soundBtn.setAttribute('aria-label', audio.enabled ? 'Turn sound off' : 'Turn sound on')
}
syncSound()
soundBtn.addEventListener('click', () => {
  audio.setEnabled(!audio.enabled)
  syncSound()
})

$('.nav-swatch').addEventListener('click', (e) => {
  const x = e.clientX || window.innerWidth / 2
  const y = e.clientY || window.innerHeight - 40
  bus('CANVAS:RIPPLE').emit({ x, y, power: 2 })
  audio.whoosh()
  pixelTransition(x, y, () => {
    store.theme = store.theme === 'white' ? 'black' : 'white'
    const main = $('main')
    main.classList.remove('white', 'black')
    main.classList.add(store.theme)
    store.scene?.setTheme(store.theme)
    // the ascii canvas must show the new colors in the captured "new" snapshot
    store.scene?.render()
  })
})

// ── canvas section triggers ─────────────────────────────────
function canvasTrigger(slug, trigger, start, end, { progress = true } = {}) {
  ScrollTrigger.create({
    trigger,
    start,
    end,
    scrub: progress || undefined,
    onUpdate: progress ? (self) => bus('CANVAS:PROGRESS').emit(slug, self.progress) : undefined,
    onEnter: () => bus('CANVAS:ENTER').emit(slug),
    onEnterBack: () => bus('CANVAS:ENTER').emit(slug),
    onLeave: () => bus('CANVAS:LEAVE').emit(slug),
    onLeaveBack: () => bus('CANVAS:LEAVE').emit(slug),
  })
}

// ── hero ────────────────────────────────────────────────────
function initHero() {
  const hero = $('.hero')
  const titles = $$('.hero h1, .hero h2')
  document.fonts.ready.then(() => fallingLetters(titles))
  setTimeout(() => {
    bus('CANVAS:ENTER').emit('hero')
    window.scrollTo(0, 0)
  }, 1000)
  canvasTrigger('hero', $('.hero-trigger'), 'top 1%', 'bottom 30%')
  gsap.to(titles, {
    opacity: 0,
    scrollTrigger: { trigger: hero.querySelector('.hero-trigger'), start: 'top top', end: 'bottom 0%', scrub: true },
  })
}

// ── introduction ────────────────────────────────────────────
const AWARD_GROUPS = [
  { label: 'Awwwards', match: /^awwwards/i },
  { label: 'FWA', match: /^fwa(?!wwwards)/i },
  { label: 'CssDesignAwards', match: /^css/i },
  { label: 'IDEA', match: /idea/i },
  { label: 'Webbie', match: /^webb/i },
  { label: 'Lovie', match: /^lovie/i },
]

function countRecognitions(works) {
  const counts = new Map()
  for (const w of works)
    for (const a of w.awards || []) {
      const group = AWARD_GROUPS.find((g) => g.match.test(a))
      const label = group ? group.label : a.trim().split(/\s+/)[0]
      counts.set(label, (counts.get(label) || 0) + 1)
    }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

function initIntroduction() {
  const root = $('.introduction')
  const text = $('.intro-text')
  const html = content.description.map((p) => `<p>${p}</p>`).join('')
  $('.intro-sr').innerHTML = html
  text.innerHTML = html

  const list = $('.recognitions')
  list.innerHTML = countRecognitions(content.works)
    .map((r) => `<li><span>${escapeHtml(r.label)} × ${r.count}</span></li>`)
    .join('')

  document.fonts.ready.then(() => {
    revealLines({ trigger: text, elements: $$('p', text), duration: 0.4, stagger: 0.08, start: 'top 80%', falling: true })
    $$('li > span', list).forEach((el) => scrambleText(el, { start: 'top 80%', falling: true }))
    ScrollTrigger.create({
      trigger: root,
      start: 'top 50%',
      end: 'bottom 75%',
      onEnter: () => bus('CANVAS:ENTER_OBJECT').emit(),
      onEnterBack: () => bus('CANVAS:ENTER_OBJECT').emit(),
      onLeave: () => bus('CANVAS:LEAVE_OBJECT').emit(),
      onLeaveBack: () => bus('CANVAS:LEAVE_OBJECT').emit(),
    })
  })
}

// ── works ───────────────────────────────────────────────────
function marqueeText(work, num) {
  const title = escapeHtml(work.title)
  let s = work.awards.length ? '' : `${num}${NBSP7}${title}↗${NBSP7}`
  for (const award of work.awards) s += `${NBSP7}${num}${NBSP7}${title}↗${NBSP7}${escapeHtml(award)}`
  while (s.length < 2000) s += s
  return s
}

function initWorks() {
  const list = $('.works-list')
  content.works.forEach((work, i) => {
    const num = i + 1 < 10 ? `0${i + 1}` : String(i + 1)
    const agency = `${work.agency}${work.with ? ` w/ ${work.with}` : ''}`
    const li = document.createElement('li')
    li.className = 'work'
    li.innerHTML = `
      <a class="work-link" href="${escapeHtml(work.url)}" target="_blank" rel="noopener">
        <span class="work-row site-grid text-small">
          <span class="work-num text-large" data-scramble>${num}</span>
          <span class="work-title text-large" data-scramble>${escapeHtml(work.title)}</span>
          <span class="work-meta">
            <span data-scramble>${escapeHtml(agency)}</span>
            <span class="desktop" data-scramble>${escapeHtml(work.position)}</span>
            <span class="desktop" data-scramble>${work.awards.length ? `${work.awards.length} Awards` : ''}</span>
          </span>
          <span class="work-year" data-scramble>${work.year}</span>
        </span>
        <span class="work-hover text-large">
          <span class="work-hover-band"><span class="work-hover-inner"><span class="work-hover-track">${marqueeText(work, num)}</span></span></span>
        </span>
      </a>`
    list.appendChild(li)

    $$('[data-scramble]', li).forEach((el) => scrambleText(el, { start: 'top 95%' }))
    ScrollTrigger.create({ trigger: li, start: 'top 95%', once: true, onEnter: () => li.classList.add('is-in-screen') })

    const link = $('.work-link', li)
    const band = $('.work-hover-band', li)
    const inner = $('.work-hover-inner', li)
    const fromBottom = (e) => {
      const r = link.getBoundingClientRect()
      return e.clientY - r.top > r.height / 2
    }
    link.addEventListener('mouseenter', (e) => {
      bus('WORK:ENTER').emit(work.title)
      li.classList.add('is-hover')
      const bottom = fromBottom(e)
      gsap.fromTo(band, { y: bottom ? '101%' : '-101%' }, { y: '0%', duration: 0.5, ease: 'power2.out', overwrite: 'all' })
      gsap.fromTo(
        inner,
        { y: bottom ? '-100%' : '100%', scaleY: 0 },
        { y: '0%', scaleY: 1, duration: 0.5, ease: 'power2.out', overwrite: 'all' },
      )
    })
    link.addEventListener('mouseleave', (e) => {
      const bottom = fromBottom(e)
      gsap.to(band, {
        y: bottom ? '101%' : '-101%',
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'all',
        onComplete: () => li.classList.remove('is-hover'),
      })
      gsap.to(inner, { y: bottom ? '-100%' : '100%', scaleY: 0, duration: 0.5, ease: 'power2.out', overwrite: 'all' })
    })
  })

  canvasTrigger('projects', $('.works'), 'top 75%', 'top 0%')
}

// ── footer ──────────────────────────────────────────────────
function initFooter() {
  const footer = $('.footer')
  $('.footer-text').innerHTML = `<p>${content.footerText}</p>`

  const socials = $('.socials')
  content.socials.forEach((s) => {
    const li = document.createElement('li')
    const a = document.createElement('a')
    a.href = s.url
    a.target = '_blank'
    a.rel = 'noopener'
    a.textContent = s.label
    a.addEventListener('click', (e) => {
      if (!s.url.startsWith('mailto:')) return
      navigator.clipboard?.writeText(s.url.replace('mailto:', '').split('?')[0]).catch(() => {})
      bus('CANVAS:RIPPLE').emit({ x: e.clientX, y: e.clientY, power: 3 })
      audio.chime()
      a.textContent = 'Copied ✓'
      setTimeout(() => (a.textContent = s.label), 1600)
    })
    li.appendChild(a)
    socials.appendChild(li)
  })

  $('.footer-fonts').innerHTML =
    `<li class="mobile-label">Fonts</li>` + content.fonts.map((f) => `<li>${escapeHtml(f)}</li>`).join('')
  const design = $('.footer-design')
  design.href = content.design.url
  design.innerHTML = `<span class="mobile-label">design</span> ${escapeHtml(content.design.label)}`

  document.fonts.ready.then(() => {
    revealLines({
      trigger: footer,
      elements: $$('.footer-text p, .socials li', footer),
      duration: 0.7,
      stagger: 0.12,
      start: 'top 20%',
      falling: true,
    })
  })

  // curtain: the panel slides up slower than the page while it comes in
  const outer = $('.footer-outer')
  const inner = $('.footer-inner')
  const canvas = $('.footer-canvas')
  gsap.set(inner, { y: '50%' })
  gsap.set(outer, { y: '-100%' })
  gsap.set(canvas, { y: '-50%' })
  gsap.to([inner, outer, canvas], {
    y: 0,
    ease: 'none',
    scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top top', scrub: true },
  })
  canvasTrigger('mail', footer, 'top 100%', undefined)
}

// ── scene (loaded when the main thread is idle) ─────────────
function initScene() {
  const start = async () => {
    const { Scene } = await import('./scene/Scene.js')
    await document.fonts.ready
    const isShape = (slug, lines, isMobile) => ({ slug, lines, isMobile })
    const s = content.shapes
    store.scene = new Scene($('#c'), $('.footer-canvas'), {
      theme: store.theme,
      shapes: [
        isShape('hero', [s.hero], false),
        isShape('hero', [s.hero], true),
        isShape('projects', [s.projects], false),
        isShape('projects', s.projectsMobile, true),
        isShape('mail', [s.mail], false),
        isShape('mail', s.mailMobile, true),
      ],
    })
    store.sceneReady = true
    bus('SCENE:READY').emit()
  }
  if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1500 })
  else setTimeout(start, 200)
}

// ── boot ────────────────────────────────────────────────────
initScene()
initHero()
initIntroduction()
initWorks()
initFooter()
lenis.stop()
runLoader({
  name: content.name,
  role: content.role,
  hint: 'Type to play · 1-0 instrument · ↑↓ pitch · ←→ echo',
}).then(() => lenis.start())
