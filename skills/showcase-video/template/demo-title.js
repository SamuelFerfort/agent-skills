// S1 · the real logo draws itself; the wordmark rises under it, then the scene
// pushes toward the camera and dissolves into S2.
import { T } from './timeline.js'
import { $, $$, P, E, show, tf, linesHTML, riseWords } from './lib.js'
import { makeLogo } from './logo.js'

let root, logo, words

export function build() {
  root = $('#s1')
  root.innerHTML = `<div class="s1-mark"></div><h1 class="s1-word">${linesHTML([['Product']])}</h1>`
  logo = makeLogo($('.s1-mark', root))
  words = $$('.wd', root)
}

export function at(t) {
  if (!show(root, t < T.s1Out[1])) return
  logo.draw(t - T.draw[0], { dDraw: T.draw[1] - T.draw[0] })
  riseWords(words, T.word, 0.06, t)
  const out = P(t, T.s1Out[0], T.s1Out[1], E.inCubic)
  tf(root, { s: 1 + 0.12 * out, o: 1 - out, blur: 10 * out })
}
