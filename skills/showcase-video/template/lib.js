// Shared helpers: math, easing, springs, DOM transforms, icons, text reveals, cursor, camera.
// Nothing here reads the clock: every function takes t (or dt) so a frame is a pure function of time.
import { ICONS } from './assets/icons.js'
import { mulberry32 } from './timeline.js'
export { mulberry32 }

export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
export const TAU = Math.PI * 2
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a, b, t) => a + (b - a) * t
export const inv = (a, b, x) => clamp((x - a) / (b - a))
export const within = (t, a, b) => t >= a && t < b
export function bez(x1, y1, x2, y2) {
  const cx = (t, a, b) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t
  return (t) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let lo = 0, hi = 1, m = t
    for (let i = 0; i < 24; i++) {
      m = (lo + hi) / 2
      if (cx(m, x1, x2) < t) lo = m
      else hi = m
    }
    return cx(m, y1, y2)
  }
}
export const E = {
  lin: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inCubic: (t) => t * t * t,
  inQuad: (t) => t * t,
  inQuart: (t) => t * t * t * t,
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  swift: bez(0.7, 0, 0.2, 1),
  // Add the product's own curves here (grep its source for cubic-bezier / ease constants).
  enter: bez(0.22, 1, 0.36, 1),
  drawer: bez(0.23, 1, 0.32, 1),
}
export const P = (t, a, b, e = E.outCubic) => e(inv(a, b, t))
// Damped spring step response (mass 1), 0 → 1, deterministic in dt.
export function spring(dt, k = 170, c = 20) {
  if (dt <= 0) return 0
  const w0 = Math.sqrt(k)
  const z = c / (2 * w0)
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z)
    return 1 - Math.exp(-z * w0 * dt) * (Math.cos(wd * dt) + ((z * w0) / wd) * Math.sin(wd * dt))
  }
  return 1 - Math.exp(-w0 * dt) * (1 + w0 * dt)
}
export const SP = {
  snappy: (dt) => spring(dt, 260, 26),
  bouncy: (dt) => spring(dt, 220, 16),
  soft: (dt) => spring(dt, 120, 20),
  word: (dt) => spring(dt, 200, 23),
  pop: (dt) => spring(dt, 320, 20),
}
export function tf(el, { x = 0, y = 0, s = 1, sx, sy, r = 0, rx = 0, ry = 0, persp = 0, o, blur } = {}) {
  const pre = persp ? `perspective(${persp}px) ` : ''
  el.style.transform = `${pre}translate3d(${x}px,${y}px,0) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${r}deg) scale(${sx ?? s},${sy ?? s})`
  if (o !== undefined) el.style.opacity = o
  if (blur !== undefined) el.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none'
}
// Hides whole scenes outside their window (cheap frames). It resets inline display,
// so an element that needs display:flex must get it from a CSS class, not a style attribute.
export const show = (el, on) => {
  el.style.display = on ? '' : 'none'
  return on
}
export const op = (el, v) => (el.style.opacity = v)
export const vis = (el, on) => (el.style.visibility = on ? 'visible' : 'hidden')

// ── icons (the product's exact set: gen-icons.mjs) ──────────────────────────
export const ic = (name, extra = '') => `<svg class="i" viewBox="0 0 24 24" ${extra}>${ICONS[name]}</svg>`
export const ICON_SVG = (name, attrs = '') => `<g ${attrs}>${ICONS[name]}</g>`
export const CURSOR = `<svg class="cursor" viewBox="0 0 24 28"><path d="M4.5 2.5v19.2l4.6-4.4 3.1 7 3.3-1.4-3-6.9h6.4z" fill="#fff" stroke="#0b0d1a" stroke-width="1.5" stroke-linejoin="round"/></svg>`

// ── text reveals ─────────────────────────────────────────────────────────────
// A line is a list of segments: 'plain words' or {c: 'class', t: 'words'}.
export function wordsHTML(line) {
  return line
    .map((seg) => {
      const cls = typeof seg === 'string' ? '' : seg.c
      const txt = typeof seg === 'string' ? seg : seg.t
      return txt
        .split(' ')
        .filter(Boolean)
        .map((w) => `<span class="wd ${cls}">${w}</span>`)
        .join(' ')
    })
    .join(' ')
}
export const linesHTML = (lines) => lines.map((l) => `<span class="mline">${wordsHTML(l)}</span>`).join('')
export function riseWords(words, t0, stagger, t, amount = 108) {
  words.forEach((w, i) => {
    const dt = t - (t0 + i * stagger)
    const k = SP.word(dt)
    w.style.transform = `translate3d(0,${(1 - k) * amount}%,0)`
    w.style.opacity = clamp(dt / 0.12)
  })
}
export function sinkWords(words, t1, stagger, t, amount = 125) {
  words.forEach((w, i) => {
    const k = P(t, t1 + i * stagger, t1 + i * stagger + 0.3, E.inCubic)
    if (k <= 0) return
    w.style.transform = `translate3d(0,${-k * amount}%,0)`
    w.style.opacity = 1 - k
  })
}
// Streamed markdown: every word its own span (layout never reflows); citation
// badges ({n}) resolve a beat after the text around them, like the real app.
export function streamHTML(parts) {
  return parts
    .map((p) => {
      if (typeof p === 'number') return `<span class="cb" data-n="${p}"><span class="cbn">${p}</span><svg class="i cbl" viewBox="0 0 24 24">${ICONS['loader-circle']}</svg></span>`
      if (p === '\n') return '</p><p>'
      const bold = typeof p !== 'string'
      const txt = bold ? p.b : p
      return txt
        .split(/(?<= )/)
        .map((w) => `<span class="aw">${bold ? `<b>${w}</b>` : w}</span>`)
        .join('')
    })
    .join('')
}
export function streamAt(root, a, b, t, lag = 0.18) {
  const items = root._items || (root._items = $$('.aw, .cb', root))
  const n = items.length
  items.forEach((w, i) => {
    const ti = a + ((b - a) * i) / n
    const dt = t - ti
    if (w.classList.contains('cb')) {
      w.style.opacity = clamp(dt / 0.06)
      const ready = dt > lag
      w.firstChild.style.opacity = ready ? 1 : 0
      const spin = w.lastChild
      spin.style.opacity = ready || dt < 0 ? 0 : 1
      spin.style.transform = `rotate(${t * 720}deg)`
      w.style.transform = `scale(${ready ? 0.85 + 0.15 * SP.pop(dt - lag) : 1})`
    } else {
      w.style.opacity = clamp(dt / 0.12)
    }
  })
}
// Shimmer: a highlight band sweeping right → left across muted text.
export function shimmer(el, t, period = 1.6) {
  const u = (t / period) % 1
  el.style.backgroundPosition = `${-50 + 250 * (1 - u)}% 0`
}

// ── typing ───────────────────────────────────────────────────────────────────
export function typingTimes(text, a, b) {
  const n = text.length
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / Math.max(1, n - 1))
}
export const typed = (text, a, b, t) => text.slice(0, typingTimes(text, a, b).filter((x) => x <= t).length)

// ── camera ───────────────────────────────────────────────────────────────────
// keys: [[t, fx, fy, s], ...] — focus point (screen px) and zoom; eased between keys.
export function camAt(keys, t, ease = E.inOutCubic) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], s: keys[0][3] }
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, x0, y0, s0] = keys[i]
    const [t1, x1, y1, s1] = keys[i + 1]
    if (t < t1) {
      const k = ease(inv(t0, t1, t))
      // zoom interpolates in log space so pushes feel even
      return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), s: Math.exp(lerp(Math.log(s0), Math.log(s1), k)) }
    }
  }
  const l = keys[keys.length - 1]
  return { x: l[1], y: l[2], s: l[3] }
}
export function applyCam(el, c, bounded = true) {
  if (bounded && c.s >= 1) {
    c = { ...c, x: clamp(c.x, 960 / c.s, 1920 - 960 / c.s), y: clamp(c.y, 540 / c.s, 1080 - 540 / c.s) }
  }
  const tx = 960 - c.x * c.s
  const ty = 540 - c.y * c.s
  el.style.transformOrigin = '0 0' // the maths below assumes it; the CSS default (center) drifts the frame
  el.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${c.s})`
  el._cam = { tx, ty, s: c.s }
}
// Rect of an element in its camera's un-zoomed screen space.
export function local(el, camEl) {
  const r = el.getBoundingClientRect()
  const c = camEl._cam || { tx: 0, ty: 0, s: 1 }
  return { x: (r.left - c.tx) / c.s, y: (r.top - c.ty) / c.s, w: r.width / c.s, h: r.height / c.s }
}
export const centerOf = (r) => [r.x + r.w / 2, r.y + r.h / 2]

// ── cursor ───────────────────────────────────────────────────────────────────
// Moves from `from` to `to` over [a, b] on a slight arc; press at `click`.
export function cursorAt(cur, ring, from, to, a, b, click, t, hideAfter = 0.9) {
  const on = t >= a - 0.12 && t < (click ?? b) + hideAfter
  show(cur, on)
  if (ring) show(ring, on && click !== null && t >= click && t < click + 0.5)
  if (!on) return
  const k = P(t, a, b, E.inOutCubic)
  const arc = Math.sin(k * Math.PI) * 40
  const x = lerp(from[0], to[0], k) + arc * 0.3
  const y = lerp(from[1], to[1], k) - arc
  const press = click !== null && within(t, click - 0.06, click + 0.12) ? 0.84 : 1
  cur.style.transform = `translate3d(${x - 5}px,${y - 3}px,0) scale(${press})`
  cur.style.opacity = P(t, a - 0.12, a + 0.08, E.lin) * (1 - P(t, (click ?? b) + hideAfter - 0.3, (click ?? b) + hideAfter, E.lin))
  if (ring && click !== null && t >= click) {
    const rk = E.outCubic(clamp((t - click) / 0.5))
    const size = 16 + 56 * rk
    ring.style.width = ring.style.height = size + 'px'
    ring.style.transform = `translate(${to[0] - size / 2}px,${to[1] - size / 2}px)`
    ring.style.opacity = 1 - rk
  }
}

// ── connections ──────────────────────────────────────────────────────────────
// A comet travelling a curve from a to b — data flowing from one element into another
// (a phrase into a form field, a citation into its passage). Faint trail, glowing head,
// a burst on arrival. `svg`: a full-stage <svg> overlay inside the same camera layer as
// the elements; measure a/b once in measure() with local()/centerOf().
let glowN = 0
export function makeLink(svg, { color = 'oklch(0.62 0.2 262)', trail = 'rgba(235,240,255,.38)' } = {}) {
  const ns = 'http://www.w3.org/2000/svg'
  if (!svg._glow) {
    svg._glow = `link-glow-${++glowN}`
    svg.insertAdjacentHTML('afterbegin', `<defs><filter id="${svg._glow}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>`)
  }
  const g = document.createElementNS(ns, 'g')
  g.innerHTML = `<path class="trail" fill="none" stroke="${trail}" stroke-width="1.5" stroke-linecap="round"/>
    <path class="glow" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" filter="url(#${svg._glow})"/>
    <path class="head" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    <circle class="dot" r="4" fill="#fff"/><circle class="burst" r="6" fill="none" stroke="#fff" stroke-width="1.5"/>`
  svg.appendChild(g)
  const [tr, gl, hd, dot, burst] = ['.trail', '.glow', '.head', '.dot', '.burst'].map((c) => g.querySelector(c))
  // Flies over [t0, t1], then the trail fades. bend: control-point offsets from a and from b.
  function at(t, a, b, t0, t1, { bend = [[0, 60], [-170, 0]], seg = 110 } = {}) {
    const on = within(t, t0, t1 + 0.9)
    g.style.display = on ? '' : 'none'
    if (!on) return
    const d = `M ${a[0]} ${a[1]} C ${a[0] + bend[0][0]} ${a[1] + bend[0][1]}, ${b[0] + bend[1][0]} ${b[1] + bend[1][1]}, ${b[0]} ${b[1]}`
    for (const p of [tr, gl, hd]) p.setAttribute('d', d)
    const len = tr.getTotalLength()
    const u = P(t, t0, t1, E.inOutCubic)
    const headOn = t < t1 + 0.05
    tr.setAttribute('stroke-dasharray', `${len * u} ${len}`)
    tr.style.opacity = 1 - P(t, t1 + 0.05, t1 + 0.6, E.lin)
    for (const p of [hd, gl]) {
      p.setAttribute('stroke-dasharray', `${seg} ${len + seg}`)
      p.setAttribute('stroke-dashoffset', `${seg - len * u}`)
      p.style.opacity = headOn ? 1 : 0
    }
    const pt = tr.getPointAtLength(len * u)
    dot.setAttribute('cx', pt.x)
    dot.setAttribute('cy', pt.y)
    dot.style.opacity = headOn ? 1 : 0
    const bk = P(t, t1, t1 + 0.5, E.outCubic)
    burst.setAttribute('cx', b[0])
    burst.setAttribute('cy', b[1])
    burst.setAttribute('r', 4 + 22 * bk)
    burst.style.opacity = t >= t1 ? 0.8 * (1 - bk) : 0
  }
  return { g, at }
}

// A touch on a phone (no cursor there): a soft dot that presses in at `at` and fades.
// el: an absolutely positioned circle inside the phone screen; x, y in the screen's units.
// Returns whether it is visible, so taps chain: if (!(tapAt(…) || tapAt(…))) el.style.opacity = 0
export function tapAt(el, t, x, y, at) {
  if (!within(t, at - 0.28, at + 0.3)) return false
  const k = t < at ? P(t, at - 0.28, at, E.outCubic) : 1 - P(t, at, at + 0.3, E.lin)
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.style.opacity = k
  el.style.transform = `translate(-50%,-50%) scale(${t < at ? 1.3 - 0.3 * k : 1 + 0.5 * P(t, at, at + 0.3, E.outCubic)})`
  return true
}

// ── grain ────────────────────────────────────────────────────────────────────
export function grainTiles(ctx) {
  const rnd = mulberry32(7)
  const tiles = []
  for (let n = 0; n < 6; n++) {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')
    const img = x.createImageData(256, 256)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() < 0.5 ? 0 : 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = Math.round(rnd() * 16)
    }
    x.putImageData(img, 0, 0)
    tiles.push(ctx.createPattern(c, 'repeat'))
  }
  return tiles
}
export function drawGrain(ctx, tiles, t) {
  const f = Math.round(t * 60)
  const rnd = mulberry32(f * 9973 + 1)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, 960, 540)
  ctx.translate(-rnd() * 256, -rnd() * 256)
  ctx.fillStyle = tiles[f % tiles.length]
  ctx.fillRect(0, 0, 960 + 256, 540 + 256)
}
