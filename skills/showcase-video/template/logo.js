// The product's real logo drawing itself. trace_logo.py turns the logo file into
// assets/logo.json (contour loops per connected piece); here every loop strokes on,
// smallest first, then the solid fill fades in over the strokes.
import { P, E } from './lib.js'

let L = null
export async function loadLogo(url = 'assets/logo.json') {
  L = await (await fetch(url)).json()
}

// Call while the parent is displayed: getBBox() needs layout.
export function makeLogo(parent, { color = '#fff', stroke, glow = 'drop-shadow(0 0 18px rgba(190,205,255,.28))' } = {}) {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', `0 0 ${L.w} ${L.h}`)
  svg.style.overflow = 'visible'
  const sw = stroke ?? L.w / 200
  const loops = L.pieces.flatMap((p) => p.loops)
  svg.innerHTML = `
    <g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      ${loops.map((d) => `<path d="${d}" pathLength="1" stroke-dasharray="1 1"/>`).join('')}
    </g>
    <path class="fill" d="${L.pieces.map((p) => p.d).join('')}" fill="${color}" fill-rule="evenodd"/>`
  if (glow) svg.style.filter = glow
  parent.appendChild(svg)
  const fill = svg.querySelector('.fill')
  const order = [...svg.querySelectorAll('g path')]
    .map((el) => {
      const b = el.getBBox()
      return { el, size: Math.hypot(b.width, b.height) }
    })
    .sort((a, b) => a.size - b.size)
  order.forEach((o, k) => (o.rank = order.length > 1 ? k / (order.length - 1) : 0))

  // u = seconds since the draw starts.
  function draw(u, { dDraw = 1.05, fillAt = dDraw * 0.8, fillDur = 0.45 } = {}) {
    for (const o of order) {
      const a = o.rank * Math.max(0, dDraw - 0.55)
      const k = P(u, a, a + 0.55, E.inOutCubic)
      o.el.setAttribute('stroke-dashoffset', (1 - k).toFixed(4))
      o.el.style.opacity = k > 0 ? 1 - P(u, fillAt + 0.1, fillAt + fillDur + 0.3, E.lin) : 0
    }
    fill.style.opacity = P(u, fillAt, fillAt + fillDur, E.inOutSine)
  }
  return { svg, draw, solid: () => draw(99) }
}
