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
// types a line like a terminal once it scrolls into view
function typeOut(el, text, trigger) {
  ScrollTrigger.create({
    trigger,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      const state = { n: 0 }
      gsap.to(state, {
        n: text.length,
        duration: Math.min(2.6, text.length * 0.022),
        ease: 'none',
        delay: 0.3,
        onUpdate: () => (el.textContent = text.slice(0, Math.round(state.n))),
      })
    },
  })
}

// keep as many stack items as fit the narrow meta column
function shortStack(stack, max = 30) {
  let s = stack[0] || ''
  for (const item of stack.slice(1, 3)) {
    if ((s + ' · ' + item).length > max) break
    s += ' · ' + item
  }
  return s
}

// what's waiting inside the card — shown in the row and as the first marquee tag
function teaser(work) {
  const media = work.media || []
  const clips = media.filter((m) => /\.(mp4|webm|mov)$/i.test(m)).length
  const playable = (work.links || []).some((l) => /itch\.io/.test(l.url))
  if (work.terminal) return { row: `$ ${work.terminal.session.length} commands_`, cta: 'Click to run it in the terminal' }
  if (playable) return { row: `▶ Playable · ${media.length} shots`, cta: 'Click — playable on itch.io' }
  if (clips) return { row: `▶ ${clips} clip${clips > 1 ? 's' : ''} · ${media.length - clips} stills`, cta: 'Click to watch it move' }
  if (media.length) return { row: `${media.length} file${media.length > 1 ? 's' : ''}`, cta: 'Click to open the gallery' }
  return { row: (work.links || []).map((l) => l.label).join(' · '), cta: 'Click to open' }
}

function marqueeText(work, num) {
  const title = escapeHtml(work.title)
  let s = ''
  for (const tag of [teaser(work).cta, work.subtitle, ...work.stack]) s += `${NBSP7}${num}${NBSP7}${title}↗${NBSP7}${escapeHtml(tag)}`
  while (s.length < 2000) s += s
  return s
}

const isVideo = (src) => /\.(mp4|webm|mov)$/i.test(src)

// ── demo terminal inside the case view ──────────────────────
const terminal = (() => {
  const root = $('.case-term')
  const screen = $('.term-screen', root)
  const cmds = $('.term-cmds', root)
  const form = $('.term-input', root)
  const field = $('.term-field', root)
  let data = null
  let run = 0 // bumps on every new command / close: cancels the previous animation
  let auto = null

  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const scrollDown = () => (screen.scrollTop = screen.scrollHeight)

  function line(cls, text = '') {
    const el = document.createElement('div')
    el.className = cls
    el.textContent = text
    screen.appendChild(el)
    scrollDown()
    return el
  }

  function promptLine() {
    const el = line('term-line term-cmdline')
    const p = document.createElement('span')
    p.className = 'term-ps1'
    p.textContent = `${data.cwd} $ `
    const t = document.createElement('span')
    el.append(p, t)
    return t
  }

  async function exec(i) {
    const item = data?.session[i]
    if (!item) return
    const id = ++run
    $$('button', cmds).forEach((b, j) => b.classList.toggle('is-active', j === i))
    audio.hover()
    const t = promptLine()
    // type the command; long commands type faster
    const step = Math.max(4, Math.min(28, 900 / item.cmd.length))
    for (let c = 0; c < item.cmd.length; c++) {
      if (id !== run) return
      t.textContent += item.cmd[c]
      if (item.cmd[c] === '\n') scrollDown()
      await wait(step)
    }
    await wait(260)
    for (const out of item.out.split('\n')) {
      if (id !== run) return
      line('term-line term-out', out)
      await wait(22)
    }
    line('term-line term-gap')
  }

  function print(text, cls = 'term-out') {
    text.split('\n').forEach((l) => line(`term-line ${cls}`, l))
    line('term-line term-gap')
  }

  function help() {
    const t = promptLine()
    t.textContent = 'help'
    print(
      [
        'Available demo commands:',
        ...data.session.map((s, i) => `  ${String(i + 1).padStart(2)}  ${s.label}`),
        '',
        '  clear  clear the screen',
        'Type a number, a label, or the command itself.',
      ].join('\n'),
    )
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const v = field.value.trim()
    field.value = ''
    if (!data || !v) return
    clearTimeout(auto)
    const q = v.toLowerCase()
    if (q === 'help' || q === '?') return help()
    if (q === 'clear' || q === 'cls') {
      run++
      screen.textContent = ''
      return
    }
    const n = parseInt(q, 10)
    let i = String(n) === q ? n - 1 : -1
    if (i < 0) i = data.session.findIndex((s) => s.cmd.toLowerCase().startsWith(q) || s.label.toLowerCase() === q)
    if (i >= 0 && i < data.session.length) return exec(i)
    run++
    const t = promptLine()
    t.textContent = v
    print(`demo shell: command not found: ${v.split(/\s+/)[0]}\nType "help" to see the available commands.`, 'term-err')
  })

  return {
    open(d) {
      run++
      clearTimeout(auto)
      data = d
      root.hidden = !d
      screen.textContent = ''
      cmds.innerHTML = ''
      if (!d) return
      $('.term-title', root).textContent = d.cwd
      d.session.forEach((s, i) => {
        const li = document.createElement('li')
        const b = document.createElement('button')
        b.type = 'button'
        b.innerHTML = `<span class="term-n">${String(i + 1).padStart(2, '0')}</span> ${escapeHtml(s.label)}`
        b.addEventListener('click', () => {
          clearTimeout(auto)
          exec(i)
        })
        li.appendChild(b)
        cmds.appendChild(li)
      })
      line('term-line term-dim', `# ${d.session.length} demo commands · click one below or type "help"`)
      line('term-line term-gap')
      auto = setTimeout(() => exec(0), 1100)
    },
    close() {
      run++
      clearTimeout(auto)
    },
  }
})()

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
    $('.case-media', root).classList.toggle('is-grid', data.mediaLayout === 'grid')
    root.classList.toggle('has-term', !!data.terminal)
    terminal.open(data.terminal || null)
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
      $$('.case-head > *, .case-info > *, .case-media figure, .case-term:not([hidden])', root),
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.04, delay: 0.35 },
    )
    $('.case-close', root).focus({ preventScroll: true })
  }

  function hide() {
    if (!open) return
    open = false
    terminal.close()
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
    head.innerHTML = `
      <span class="work-group-label" data-scramble>${escapeHtml(group.label)}</span>
      ${group.hint ? `<span class="work-group-hint"><span class="work-group-arrow">↳ </span><span class="sr-only">${escapeHtml(group.hint)}</span><span class="hint-typed" aria-hidden="true"></span><span class="blink-cursor" aria-hidden="true"></span></span>` : ''}
      <span class="work-group-count" data-scramble>(${String(group.works.length).padStart(2, '0')})</span>`
    list.appendChild(head)
    $$('[data-scramble]', head).forEach((el) => scrambleText(el, { start: 'top 95%' }))
    const typed = $('.hint-typed', head)
    if (typed) typeOut(typed, group.hint, head)

    group.works.forEach((work) => addWork(list, work, ++index))
  })

  canvasTrigger('projects', $('.works'), 'top 75%', 'top 0%')
}

function addWork(list, work, i) {
    const num = i < 10 ? `0${i}` : String(i)
    const li = document.createElement('li')
    li.className = 'work'
    li.innerHTML = `
      <button class="work-link" type="button" aria-haspopup="dialog">
        <span class="work-row site-grid text-small">
          <span class="work-num text-large" data-scramble>${num}</span>
          <span class="work-title text-large" data-scramble>${escapeHtml(work.title)}</span>
          <span class="work-meta">
            <span data-scramble>${escapeHtml(work.category)}</span>
            <span class="desktop" data-scramble>${escapeHtml(shortStack(work.stack))}</span>
            <span class="desktop work-teaser" data-scramble>${escapeHtml(teaser(work).row)}</span>
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
