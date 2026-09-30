// Shared timeline: the page (visuals) and audio.ts (music + SFX) both import it,
// so every sound lands on the frame it belongs to. 120 BPM: beat 0.5 s, bar 2 s.
// Scene boundaries sit on bar lines (even seconds) so cuts land on downbeats.
// Every key must be unique: a duplicate silently wins over the earlier one
// (render.mjs warns about duplicates on every run).
export const BPM = 120
export const FPS = 60
export const W = 1920
export const H = 1080
export const DURATION = 12

export const T = {
  // S1 · the logo draws itself (bars 0–1)
  logo: 0.4,
  draw: [0.4, 1.6],
  word: 1.7,
  s1Out: [3.55, 4.0],
  // S2 · one product moment (bars 2–4)
  ui: 4.0,
  type: [4.6, 5.7],
  cur: [5.75, 6.25],
  send: 6.35,
  answer: [6.8, 8.4],
  push: [7.0, 8.8], // camera pushes toward the answer
  s2Out: [9.55, 10.0],
  // S3 · end card (bar 5)
  end: 10.0,
  endTag: 10.55,
  fadeOut: [11.2, 12.0],
}

// Scene windows [id, from, to]. Boundaries are the planned cuts: `render.mjs review`
// filmstrips each one, qa.py flags any hard cut the file has that is NOT listed here
// (a jump), and audio.ts reports stem levels per scene.
export const SCENES = [
  ['title', 0, T.ui],
  ['ui', T.ui, T.end],
  ['end', T.end, DURATION],
]

export const QUESTION = 'What changed this week?'
// Streamed answer: strings are words, {b} is bold, numbers are citation badges, '\n' a paragraph.
export const ANSWER = ['Three things: ', { b: 'new prices' }, ' from Monday ', 1, ', the ', { b: 'summer opening hours' }, ' ', 2, ' and one supplier fewer ', 1, '.']

// When each character of a typed string appears.
export function typingTimes(text, a, b) {
  const n = text.length
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / Math.max(1, n - 1))
}

// Times at which each citation badge resolves (mirrors lib.streamAt) — audio.ts pops on them.
export function badgeTimes(parts, a, b, lag = 0.18) {
  const items = []
  for (const p of parts) {
    if (typeof p === 'number') items.push('cb')
    else if (p !== '\n') for (const _ of (typeof p === 'string' ? p : p.b).split(/(?<= )/)) items.push('w')
  }
  return items.map((k, i) => (k === 'cb' ? a + ((b - a) * i) / items.length + lag : null)).filter((x) => x !== null)
}

// Deterministic PRNG shared by both sides (never Math.random: frames must repeat exactly).
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
