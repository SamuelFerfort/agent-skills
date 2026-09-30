// S2 · one product moment: the question is typed, a cursor clicks send, the answer
// streams in with citation badges while the camera pushes toward it.
// Rebuild the product's real markup here (classes, spacing, strings copied from its
// source), not a lookalike: the viewer should recognise the actual app.
import { T, QUESTION, ANSWER } from './timeline.js'
import { $, P, E, SP, show, tf, ic, CURSOR, typed, streamHTML, streamAt, camAt, applyCam, local, centerOf, cursorAt } from './lib.js'

let root, cam, win, input, send, q, answer, cur, ring, sendXY
// Camera keys: [t, focusX, focusY, zoom] in the scene's un-zoomed 1920×1080 space.
const CAM = [
  [T.ui, 960, 540, 1],
  [T.push[0], 960, 540, 1],
  [T.push[1], 960, 430, 1.3],
]

export function build() {
  root = $('#s2')
  root.innerHTML = `
    <div class="layer" id="s2-cam">
      <div class="win">
        <div class="win-bar"><i></i><i></i><i></i></div>
        <div class="s2-thread">
          <div class="s2-q"></div>
          <div class="s2-a"><p>${streamHTML(ANSWER)}</p></div>
        </div>
        <div class="s2-composer"><span class="s2-input" data-ph="Ask anything…"></span><div class="s2-send">${ic('arrow-up')}</div></div>
      </div>
    </div>
    ${CURSOR}<div class="ring"></div>`
  cam = $('#s2-cam')
  win = $('.win', root)
  input = $('.s2-input', root)
  send = $('.s2-send', root)
  q = $('.s2-q', root)
  answer = $('.s2-a', root)
  cur = $('.cursor', root)
  ring = $('.ring', root)
}

// Layout is read once (fonts loaded, camera at rest) — never per frame.
export function measure() {
  applyCam(cam, { x: 960, y: 540, s: 1 })
  sendXY = centerOf(local(send, cam))
}

export function at(t) {
  if (!show(root, t >= T.ui && t < T.end)) return
  const k = SP.soft(t - T.ui)
  tf(win, { y: (1 - k) * 70, s: 0.96 + 0.04 * k, o: P(t, T.ui, T.ui + 0.25, E.lin) })
  applyCam(cam, camAt(CAM, t))
  const sent = t >= T.send
  const text = sent ? '' : typed(QUESTION, T.type[0], T.type[1], t)
  input.textContent = text
  input.classList.toggle('empty', text === '') // always pass a boolean: toggle(cls, undefined) flips
  input.classList.toggle('caret', !sent && t >= T.type[0])
  q.textContent = QUESTION
  show(q, sent)
  tf(q, { y: (1 - SP.snappy(t - T.send)) * 30, o: P(t, T.send, T.send + 0.15, E.lin) })
  streamAt(answer, T.answer[0], T.answer[1], t)
  cursorAt(cur, ring, [1480, 980], sendXY, T.cur[0], T.cur[1], T.send, t, 0.6)
  root.style.opacity = 1 - P(t, T.s2Out[0], T.s2Out[1], E.inCubic)
}
