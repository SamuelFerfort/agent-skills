// S3 · end card: logo, name, one useful line, the URL. Holds still for the last bars.
import { T } from './timeline.js'
import { $, $$, P, E, SP, show, tf, linesHTML, riseWords } from './lib.js'
import { makeLogo } from './logo.js'

let root, mark, logo, word, tag, url

export function build() {
  root = $('#s3')
  root.innerHTML = `
    <div class="s3-mark"></div>
    <div class="s3-word">${linesHTML([['Product']])}</div>
    <div class="s3-tag">${linesHTML([['One useful line, not a slogan.']])}</div>
    <div class="s3-url">product.com</div>`
  mark = $('.s3-mark', root)
  logo = makeLogo(mark, { glow: '' })
  word = $$('.s3-word .wd', root)
  tag = $$('.s3-tag .wd', root)
  url = $('.s3-url', root)
}

export function at(t) {
  if (!show(root, t >= T.end)) return
  logo.solid()
  tf(mark, { s: 0.7 + 0.3 * SP.bouncy(t - T.end), o: P(t, T.end, T.end + 0.2, E.lin) })
  riseWords(word, T.end + 0.15, 0.05, t)
  riseWords(tag, T.endTag, 0.035, t)
  url.style.opacity = P(t, T.endTag + 0.45, T.endTag + 0.85, E.lin)
}
