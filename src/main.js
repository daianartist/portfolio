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
$('.nav-cv').href = content.cv

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
function initIntroduction() {
  const root = $('.introduction')
  const text = $('.intro-text')
  const html = content.description.map((p) => `<p>${p}</p>`).join('')
  $('.intro-sr').innerHTML = html
  text.innerHTML = html

  const list = $('.recognitions')
  list.innerHTML = content.facts.map((f) => `<li><span>${escapeHtml(f)}</span></li>`).join('')

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
  let s = ''
  for (const tag of [work.subtitle, ...work.stack]) s += `${NBSP7}${num}${NBSP7}${title}↗${NBSP7}${escapeHtml(tag)}`
  while (s.length < 2000) s += s
  return s
}

const isVideo = (src) => /\.(mp4|webm|mov)$/i.test(src)

// ── case view (project details / certificate) ───────────────
const caseView = (() => {
  const root = $('.case')
  const panel = $('.case-panel', root)
  let lastFocus = null
  let open = false

  const set = (sel, html) => ($(sel, root).innerHTML = html)

  function show(data, origin) {
    lastFocus = document.activeElement
    set('.case-num', escapeHtml(data.num || ''))
    set('.case-title', escapeHtml(data.title))
    set('.case-sub', escapeHtml(data.subtitle || ''))
    set('.case-desc', escapeHtml(data.desc || ''))
    set('.case-flow', escapeHtml(data.flow || ''))
    set('.case-stack', (data.stack || []).map((s) => `<li>${escapeHtml(s)}</li>`).join(''))
    set(
      '.case-links',
      (data.links || [])
        .map((l) => `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)} ↗</a></li>`)
        .join(''),
    )
    set(
      '.case-media',
      (data.media || [])
        .map((src) =>
          isVideo(src)
            ? `<figure><video src="${escapeHtml(src)}" muted loop playsinline autoplay controls preload="metadata"></video></figure>`
            : `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(data.title)}" loading="lazy" decoding="async"></figure>`,
        )
        .join(''),
    )
    root.classList.toggle('no-media', !(data.media || []).length)
    root.classList.toggle('is-image-only', !!data.imageOnly)
    $('.case-flow', root).hidden = !data.flow

    root.setAttribute('aria-hidden', 'false')
    root.classList.add('is-open')
    panel.scrollTop = 0
    open = true
    lenis.stop()
    audio.whoosh()
    const fromBottom = origin ? origin.y > window.innerHeight / 2 : true
    gsap.fromTo(
      panel,
      { clipPath: fromBottom ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.inOut', overwrite: 'all' },
    )
    gsap.fromTo(
      $$('.case-head > *, .case-info > *, .case-media figure', root),
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.04, delay: 0.35 },
    )
    $('.case-close', root).focus({ preventScroll: true })
  }

  function hide() {
    if (!open) return
    open = false
    $$('video', root).forEach((v) => v.pause())
    gsap.to(panel, {
      clipPath: 'inset(0% 0% 100% 0%)',
      duration: 0.5,
      ease: 'power3.inOut',
      overwrite: 'all',
      onComplete: () => {
        root.classList.remove('is-open')
        root.setAttribute('aria-hidden', 'true')
        set('.case-media', '')
      },
    })
    lenis.start()
    lastFocus?.focus?.({ preventScroll: true })
  }

  $('.case-close', root).addEventListener('click', hide)
  root.addEventListener('click', (e) => e.target === root && hide())
  window.addEventListener('keydown', (e) => e.key === 'Escape' && hide(), true)
  return { show, hide, get open() { return open } }
})()

function initWorks() {
  const list = $('.works-list')
  let index = 0
  content.workGroups.forEach((group) => {
    const head = document.createElement('li')
    head.className = 'work-group site-grid text-small'
    head.innerHTML = `<span class="work-group-label" data-scramble>${escapeHtml(group.label)}</span><span class="work-group-count" data-scramble>(${String(group.works.length).padStart(2, '0')})</span>`
    list.appendChild(head)
    $$('[data-scramble]', head).forEach((el) => scrambleText(el, { start: 'top 95%' }))

    group.works.forEach((work) => addWork(list, work, ++index))
  })

  canvasTrigger('projects', $('.works'), 'top 75%', 'top 0%')
}

function addWork(list, work, i) {
    const num = i < 10 ? `0${i}` : String(i)
    const files = (work.media || []).length
    const li = document.createElement('li')
    li.className = 'work'
    li.innerHTML = `
      <button class="work-link" type="button" aria-haspopup="dialog">
        <span class="work-row site-grid text-small">
          <span class="work-num text-large" data-scramble>${num}</span>
          <span class="work-title text-large" data-scramble>${escapeHtml(work.title)}</span>
          <span class="work-meta">
            <span data-scramble>${escapeHtml(work.category)}</span>
            <span class="desktop" data-scramble>${escapeHtml(work.stack.slice(0, 3).join(' · '))}</span>
            <span class="desktop" data-scramble>${files ? `${files} Files` : (work.links || []).map((l) => l.label).join(' · ')}</span>
          </span>
          <span class="work-year" data-scramble>${escapeHtml(work.year || '↗')}</span>
        </span>
        <span class="work-hover text-large">
          <span class="work-hover-band"><span class="work-hover-inner"><span class="work-hover-track">${marqueeText(work, num)}</span></span></span>
        </span>
      </button>`
    list.appendChild(li)

    $$('[data-scramble]', li).forEach((el) => scrambleText(el, { start: 'top 95%' }))
    ScrollTrigger.create({ trigger: li, start: 'top 95%', once: true, onEnter: () => li.classList.add('is-in-screen') })

    const link = $('.work-link', li)
    link.addEventListener('click', (e) => {
      bus('CANVAS:RIPPLE').emit({ x: e.clientX, y: e.clientY, power: 2 })
      caseView.show({ ...work, num }, { x: e.clientX, y: e.clientY })
    })
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
}

// ── about: experience, education, certifications, stack ────
function initAbout() {
  const root = $('.about')
  const row = (cells, attrs = '') =>
    `<li class="about-row"${attrs}>${cells.map(([cls, html]) => `<span class="${cls}" data-scramble>${html}</span>`).join('')}</li>`
  const block = (label, rows) => `
    <div class="about-block site-grid text-small">
      <h3 class="about-label" data-scramble>${label}</h3>
      <ul class="about-list">${rows.join('')}</ul>
    </div>`

  root.innerHTML = [
    `<h2 class="about-heading site-grid"><span class="text-large" data-scramble>About</span></h2>`,
    block(
      'Experience',
      content.experience.map((e) =>
        row([
          ['about-a', escapeHtml(e.period)],
          ['about-b', `${escapeHtml(e.role)} — ${escapeHtml(e.company)}`],
          ['about-c', escapeHtml(e.detail)],
        ]),
      ),
    ),
    block(
      'Education',
      content.education.map((e) =>
        row([
          ['about-a', escapeHtml(e.period)],
          ['about-b', escapeHtml(e.title)],
          ['about-c', escapeHtml(e.detail)],
        ]),
      ),
    ),
    block(
      'Certifications',
      content.certifications.map((c, i) =>
        row(
          [
            ['about-a', escapeHtml(c.org)],
            ['about-b', escapeHtml(c.title)],
            ['about-c about-open', 'View ↗'],
          ],
          ` data-cert="${i}" role="button" tabindex="0"`,
        ),
      ),
    ),
    block(
      'Stack',
      content.skills.map((s) =>
        row([
          ['about-a', escapeHtml(s.label)],
          ['about-b about-wide', escapeHtml(s.value)],
        ]),
      ),
    ),
    block('CV', [
      row(
        [
          ['about-a', escapeHtml(content.name)],
          ['about-b', 'Curriculum Vitae — PDF'],
          ['about-c about-open', `<a href="${escapeHtml(content.cv)}" target="_blank" rel="noopener">Open ↗</a>`],
        ],
        ' data-cv',
      ),
    ]),
  ].join('')

  $$('[data-scramble]', root).forEach((el) => scrambleText(el, { start: 'top 95%' }))
  $$('.about-row, .about-block', root).forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: 'top 95%', once: true, onEnter: () => el.classList.add('is-in-screen') }),
  )

  const openCert = (el, e) => {
    const c = content.certifications[+el.dataset.cert]
    caseView.show({ title: c.title, subtitle: c.org, media: [c.image], imageOnly: true }, e && { x: e.clientX, y: e.clientY })
  }
  $$('[data-cert]', root).forEach((el) => {
    el.addEventListener('click', (e) => openCert(el, e))
    el.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openCert(el)))
    el.addEventListener('mouseenter', () => audio.hover())
  })
  $('[data-cv]', root).addEventListener('click', (e) => {
    if (e.target.closest('a')) return
    window.open(content.cv, '_blank', 'noopener')
  })
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
initAbout()
initFooter()
lenis.stop()
runLoader({
  name: content.name,
  role: content.role,
  hint: 'Type to play · 1-0 instrument · ↑↓ pitch · ←→ echo',
}).then(() => lenis.start())
