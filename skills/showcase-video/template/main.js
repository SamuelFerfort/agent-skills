// Orchestrates the scenes; every frame is a pure function of t: window.__seek(t).
// `index.html?t=5.2` freezes on a frame; `node render.mjs serve` plays it live with sound.
import { T, DURATION } from './timeline.js'
import { $, $$, P, E, grainTiles, drawGrain } from './lib.js'
import { loadLogo } from './logo.js'
// DEMO scenes: they only prove the engine runs (logo draw, typing, streaming, camera,
// cursor, end card). Replace them with the approved storyboard's scenes — they are not
// a structure to reuse.
import * as s1 from './demo-title.js'
import * as s2 from './demo-ui.js'
import * as s3 from './demo-end.js'

// Each scene module: build() creates its DOM (ids prefixed with the scene, e.g. s2-…),
// optional measure() reads layout once after fonts load, at(t) sets every style for time t.
const MODULES = [s1, s2, s3]
const gctx = $('#grain').getContext('2d')
let tiles

function seek(t) {
  $('#bgGlow').style.transform = `translate3d(${Math.sin(t * 0.21) * 60}px,${Math.cos(t * 0.17) * 40}px,0) scale(${1 + 0.06 * Math.sin(t * 0.3)})`
  for (const s of MODULES) s.at(t)
  drawGrain(gctx, tiles, t)
  $('#fade').style.opacity = Math.max(1 - P(t, 0, 0.4, E.lin), P(t, T.fadeOut[0], T.fadeOut[1], E.inOutSine))
}

// A duplicate id makes a later scene style an earlier scene's element — fail loudly.
function lintIds() {
  const n = new Map()
  for (const el of $$('[id]')) n.set(el.id, (n.get(el.id) || 0) + 1)
  const dup = [...n].filter(([, c]) => c > 1).map(([id]) => id)
  if (dup.length) console.error(`duplicate ids: ${dup.join(', ')}`)
}

window.__ready = (async () => {
  await loadLogo()
  for (const s of MODULES) s.build()
  tiles = grainTiles(gctx)
  await document.fonts.ready
  await Promise.all([...document.fonts].map((f) => f.load?.()))
  await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r)))))
  for (const s of MODULES) await s.measure?.()
  lintIds()
  seek(0)
  return true
})()
window.__seek = seek
window.__duration = DURATION

const params = new URLSearchParams(location.search)
window.__ready.then(() => {
  if (params.has('t')) seek(parseFloat(params.get('t')))
  if (params.has('play')) livePlayer(parseFloat(params.get('play')) || 0)
})

// Live preview for humans (`node render.mjs serve`): plays from ?play=<t> with the
// soundtrack (out/audio.wav, else out/audio_raw.wav) and a timecode to quote in feedback.
// Space pauses, ←/→ seek 1 s (shift 0.1 s), h hides the timecode. The renderer never loads it.
async function livePlayer(start) {
  const tc = document.createElement('div')
  tc.style.cssText = 'position:fixed;left:16px;bottom:14px;z-index:9999;font:600 18px ui-monospace,monospace;color:#fff;background:#000b;padding:4px 10px;border-radius:6px'
  document.body.appendChild(tc)
  const audio = new Audio()
  for (const src of ['out/audio.wav', 'out/audio_raw.wav']) {
    const r = await fetch(src)
    if (r.ok) {
      audio.src = URL.createObjectURL(await r.blob()) // a blob is seekable without HTTP ranges
      await new Promise((ok) => audio.addEventListener('loadedmetadata', ok, { once: true }))
      break
    }
  }
  let t = start, playing = true, last = performance.now(), hint = audio.src ? '' : ' · no audio (bun audio.ts)'
  const sync = () => audio.src && (audio.currentTime = t)
  const play = () => audio.src && audio.play().then(() => (hint = ''), () => (hint = ' · click for sound'))
  sync()
  play()
  addEventListener('click', () => playing && play())
  addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      playing = !playing
      playing ? (sync(), play()) : audio.pause()
      e.preventDefault()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      t = Math.min(DURATION, Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 0.1 : 1)))
      sync()
    } else if (e.key === 'h') tc.hidden = !tc.hidden
  })
  const loop = (now) => {
    if (playing) {
      t = audio.src && !audio.paused ? audio.currentTime : t + (now - last) / 1000 // audio is the clock
      if (t >= DURATION) {
        t = 0
        sync()
      }
    }
    last = now
    seek(t)
    tc.textContent = `${t.toFixed(2)} s${playing ? '' : ' · paused'}${hint}`
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
