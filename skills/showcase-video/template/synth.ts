// Synth engine: everything is generated from math (no samples, nothing to license).
// audio.ts imports these, writes the arrangement + SFX from timeline.js cues, and
// calls mixdown(). 48 kHz stereo; sounds are Float32Arrays placed on buses by time.
import fs from 'node:fs'
import path from 'node:path'
import { DURATION, T, mulberry32 } from './timeline.js'

export const SR = 48000
export const LEN = Math.ceil((DURATION + 0.1) * SR)
const PI = Math.PI
const TAU = PI * 2
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
export const rnd = mulberry32(1234)
export const S = (sec: number) => Math.max(1, Math.round(sec * SR))
export const db = (d: number) => Math.pow(10, d / 20)
// ── buses ────────────────────────────────────────────────────────────────────
export type St = { L: Float32Array; R: Float32Array }
export const bus = (): St => ({ L: new Float32Array(LEN), R: new Float32Array(LEN) })
export const B = {
  drums: bus(), // not ducked
  bass: bus(), // ducked hard
  music: bus(), // plucks, melody, chops (ducked lightly)
  pad: bus(), // ducked
  sfx: bus(),
  verb: bus(), // reverb send
  delay: bus(), // delay send
}
export type Send = { verb?: number; delay?: number }
export function place(target: St, x: Float32Array, t: number, gain = 1, pan = 0, send: Send = {}) {
  const i0 = Math.round(t * SR)
  const gl = Math.cos(((pan + 1) * PI) / 4) * gain * Math.SQRT2
  const gr = Math.sin(((pan + 1) * PI) / 4) * gain * Math.SQRT2
  const vs = send.verb ?? 0
  const ds = send.delay ?? 0
  for (let i = 0; i < x.length; i++) {
    const j = i0 + i
    if (j < 0) continue
    if (j >= LEN) break
    const l = x[i] * gl
    const r = x[i] * gr
    target.L[j] += l
    target.R[j] += r
    if (vs) {
      B.verb.L[j] += l * vs
      B.verb.R[j] += r * vs
    }
    if (ds) {
      B.delay.L[j] += l * ds
      B.delay.R[j] += r * ds
    }
  }
}
export function placeSt(target: St, x: St, t: number, gain = 1, send: Send = {}) {
  const i0 = Math.round(t * SR)
  for (let i = 0; i < x.L.length; i++) {
    const j = i0 + i
    if (j < 0) continue
    if (j >= LEN) break
    const l = x.L[i] * gain
    const r = x.R[i] * gain
    target.L[j] += l
    target.R[j] += r
    if (send.verb) {
      B.verb.L[j] += l * send.verb
      B.verb.R[j] += r * send.verb
    }
    if (send.delay) {
      B.delay.L[j] += l * send.delay
      B.delay.R[j] += r * send.delay
    }
  }
}

// ── primitives ───────────────────────────────────────────────────────────────
export function blep(t: number, dt: number) {
  if (t < dt) {
    t /= dt
    return t + t - t * t - 1
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt
    return t * t + t + t + 1
  }
  return 0
}
// TPT state-variable filter; cutoff can be a function of the sample index.
export function svf(x: Float32Array, fc: number | ((i: number) => number), q = 0.707, mode: 'lp' | 'bp' | 'hp' = 'lp') {
  const y = new Float32Array(x.length)
  const k = 1 / q
  let ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0
  const fn = typeof fc === 'function' ? fc : null
  const set = (f: number) => {
    const g = Math.tan((PI * Math.min(Math.max(f, 10), SR * 0.45)) / SR)
    a1 = 1 / (1 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
  }
  if (!fn) set(fc as number)
  for (let i = 0; i < x.length; i++) {
    if (fn && (i & 15) === 0) set(fn(i))
    const v3 = x[i] - ic2
    const v1 = a1 * ic1 + a2 * v3
    const v2 = ic2 + a2 * ic1 + a3 * v3
    ic1 = 2 * v1 - ic1
    ic2 = 2 * v2 - ic2
    y[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x[i] - k * v1 - v2
  }
  return y
}
export function noise(n: number, r = rnd) {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1
  return x
}
export function mulEnv(x: Float32Array, f: (t: number) => number) {
  for (let i = 0; i < x.length; i++) x[i] *= f(i / SR)
  return x
}
export const expd = (tau: number) => (t: number) => Math.exp(-t / tau)
export const ad = (a: number, tau: number) => (t: number) => (t < a ? t / a : Math.exp(-(t - a) / tau))
export function sweepSine(dur: number, f: (t: number) => number, amp: (t: number) => number) {
  const n = S(dur)
  const x = new Float32Array(n)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    ph += f(t) / SR
    x[i] = Math.sin(TAU * ph) * amp(t)
  }
  return x
}

// ── drums ────────────────────────────────────────────────────────────────────
export function kick(gain = 1) {
  const n = S(0.55)
  const x = new Float32Array(n)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const f = 46 + 120 * Math.exp(-t / 0.035) + 60 * Math.exp(-t / 0.006)
    ph += f / SR
    const amp = Math.min(1, t / 0.0015) * Math.exp(-t / 0.3)
    x[i] = Math.tanh(1.8 * Math.sin(TAU * ph) * amp) / Math.tanh(1.8)
  }
  const click = svf(mulEnv(noise(S(0.012)), expd(0.0025)), 3500, 0.7, 'hp')
  for (let i = 0; i < click.length; i++) x[i] += click[i] * 0.35
  return x.map((v) => v * gain) as Float32Array
}
export function clap() {
  const n = S(0.45)
  const env = (t: number) => {
    let e = 0
    for (const o of [0, 0.009, 0.019]) if (t >= o) e = Math.max(e, Math.exp(-(t - o) / 0.0055))
    if (t >= 0.026) e = Math.max(e, 0.55 * Math.exp(-(t - 0.026) / 0.11))
    return e
  }
  const x = mulEnv(noise(n), env)
  const y = svf(x, 1350, 0.9, 'bp')
  const z = svf(x, 4200, 0.8, 'bp')
  for (let i = 0; i < n; i++) y[i] = y[i] * 1.6 + z[i] * 0.4
  return y
}
const HAT_F = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.72)
export function hat(open = false) {
  const dur = open ? 0.32 : 0.06
  const n = S(dur)
  const m = new Float32Array(n)
  const phs = HAT_F.map(() => rnd())
  for (let i = 0; i < n; i++) {
    let v = 0
    for (let k = 0; k < HAT_F.length; k++) {
      phs[k] += HAT_F[k] / SR
      v += phs[k] % 1 < 0.5 ? 1 : -1
    }
    m[i] = v / 6
  }
  const x = noise(n)
  for (let i = 0; i < n; i++) x[i] = x[i] * 0.6 + m[i] * 0.5
  const y = svf(svf(x, 7200, 0.7, 'hp'), 11000, 0.6, 'bp')
  return mulEnv(y, ad(0.001, open ? 0.12 : 0.018))
}
export function crash(dur = 2.2) {
  const n = S(dur)
  const a = svf(noise(n), 4000, 0.6, 'hp')
  const b = hat(true)
  for (let i = 0; i < b.length; i++) a[i] += b[i] * 0.6
  return mulEnv(a, (t) => Math.min(1, t / 0.002) * Math.exp(-t / 0.7))
}
export function snare(tone = 190) {
  const n = S(0.25)
  const body = sweepSine(0.25, (t) => tone * (1 + 0.5 * Math.exp(-t / 0.01)), expd(0.05))
  const nz = svf(mulEnv(noise(n), expd(0.08)), 3200, 0.7, 'bp')
  const hi = svf(mulEnv(noise(n), expd(0.05)), 6000, 0.7, 'hp')
  for (let i = 0; i < n; i++) body[i] = body[i] * 0.7 + nz[i] * 1.1 + hi[i] * 0.4
  return body
}

// ── tonal instruments ────────────────────────────────────────────────────────
// Supersaw chord: 5 detuned saws per note, spread in stereo, low-passed.
export function padChord(notes: number[], dur: number, opt: { atk?: number; rel?: number; cut?: (t: number) => number; bright?: number } = {}) {
  const atk = opt.atk ?? 0.35
  const rel = opt.rel ?? 0.9
  const n = S(dur + rel)
  const L = new Float32Array(n), R = new Float32Array(n)
  const det = [-0.11, -0.05, 0, 0.05, 0.11]
  const pans = [-0.9, -0.45, 0, 0.45, 0.9]
  for (const note of notes) {
    const f0 = mtof(note)
    det.forEach((d, k) => {
      const f = f0 * Math.pow(2, d / 12)
      let ph = rnd()
      const dt = f / SR
      const gl = Math.cos(((pans[k] + 1) * PI) / 4), gr = Math.sin(((pans[k] + 1) * PI) / 4)
      for (let i = 0; i < n; i++) {
        const y = 2 * ph - 1 - blep(ph, dt)
        ph += dt
        if (ph >= 1) ph -= 1
        L[i] += y * gl
        R[i] += y * gr
      }
    })
  }
  const cut = opt.cut ?? (() => 2600)
  const fL = svf(L, (i) => cut(i / SR), 0.6)
  const fR = svf(R, (i) => cut(i / SR), 0.6)
  const g = 0.6 / Math.sqrt(notes.length * 5)
  const env = (t: number) => (t < atk ? Math.sin(((t / atk) * PI) / 2) : t < dur ? 1 : Math.exp(-(t - dur) / (rel / 3)))
  for (let i = 0; i < n; i++) {
    const e = env(i / SR) * g
    fL[i] *= e
    fR[i] *= e
  }
  return { L: fL, R: fR }
}
export function pluck(note: number, vel = 1, bright = 1, decay = 0.32) {
  const dur = decay * 2.6
  const n = S(dur)
  const f = mtof(note)
  const x = new Float32Array(n)
  let p1 = rnd(), p2 = rnd(), p3 = rnd()
  const d1 = f / SR, d2 = (f * Math.pow(2, 0.07 / 12)) / SR, d3 = f / 2 / SR
  for (let i = 0; i < n; i++) {
    const a = 2 * p1 - 1 - blep(p1, d1)
    const b = 2 * p2 - 1 - blep(p2, d2)
    const c = p3 < 0.5 ? 1 : -1
    p1 = (p1 + d1) % 1
    p2 = (p2 + d2) % 1
    p3 = (p3 + d3) % 1
    x[i] = a * 0.5 + b * 0.5 + c * 0.18
  }
  const y = svf(x, (i) => 350 + 5200 * bright * vel * Math.exp(-i / SR / 0.09), 0.9)
  return mulEnv(y, (t) => Math.min(1, t / 0.002) * Math.exp(-t / decay) * vel)
}
// FM mallet / bell.
export function fm(note: number, dur: number, ratio: number, index: number, idxTau: number, ampTau: number) {
  const f = mtof(note)
  const n = S(dur)
  const x = new Float32Array(n)
  let pc = 0, pm = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    pm += (f * ratio) / SR
    const mod = Math.sin(TAU * pm) * index * Math.exp(-t / idxTau)
    pc += f / SR
    x[i] = Math.sin(TAU * pc + mod) * Math.min(1, t / 0.002) * Math.exp(-t / ampTau)
  }
  return x
}
export const mallet = (note: number, dur = 1.2) => fm(note, dur, 2, 2.2, 0.12, 0.45)
export const bell = (note: number, dur = 2.4) => {
  const a = fm(note, dur, 3.5, 2.6, 0.5, 0.8)
  const b = fm(note + 12, dur, 1, 0.6, 0.3, 0.35)
  for (let i = 0; i < a.length; i++) a[i] = a[i] * 0.8 + b[i] * 0.25
  return a
}
export function bassNote(note: number, dur: number, withSaw = true) {
  const n = S(dur + 0.08)
  const f = mtof(note)
  const x = new Float32Array(n)
  let ps = 0, pw = rnd()
  const dt = f / SR
  for (let i = 0; i < n; i++) {
    ps += f / 2 / SR
    const sub = Math.sin(TAU * ps)
    const saw = withSaw ? 2 * pw - 1 - blep(pw, dt) : 0
    pw = (pw + dt) % 1
    x[i] = sub * 0.75 + saw * 0.35
  }
  const y = svf(x, (i) => 260 + 700 * Math.exp(-i / SR / 0.12), 0.8)
  return mulEnv(y, (t) => Math.min(1, t / 0.004) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.02)))
}
// Vocal-chop: pulse + saw through two vowel formants.
const VOWELS = [[730, 1090], [570, 840], [300, 870], [440, 1020], [660, 1700]]
export function chop(note: number, dur: number, vowel: number) {
  const n = S(dur + 0.08)
  const f = mtof(note)
  const x = new Float32Array(n)
  let p = rnd()
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const vib = 1 + 0.004 * Math.sin(TAU * 5.5 * t)
    const dt = (f * vib) / SR
    x[i] = 2 * p - 1 - blep(p, dt)
    p = (p + dt) % 1
  }
  const [f1, f2] = VOWELS[vowel % VOWELS.length]
  const a = svf(x, f1, 6, 'bp')
  const b = svf(x, f2, 8, 'bp')
  const y = new Float32Array(n)
  for (let i = 0; i < n; i++) y[i] = a[i] * 1.0 + b[i] * 0.55
  return mulEnv(y, (t) => Math.min(1, t / 0.012) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.03)))
}

// ── sound design ─────────────────────────────────────────────────────────────
export function whoosh(dur: number, f0: number, f1: number, q = 1.2, shape = 0.5) {
  const n = S(dur)
  const x = noise(n)
  const y = svf(x, (i) => f0 * Math.pow(f1 / f0, i / n), q, 'bp')
  return mulEnv(y, (t) => {
    const u = t / dur
    return u < shape ? Math.pow(u / shape, 2) : Math.pow(1 - (u - shape) / (1 - shape), 1.6)
  })
}
export function riser(dur: number) {
  const n = S(dur)
  const a = svf(noise(n), (i) => 300 * Math.pow(9000 / 300, Math.pow(i / n, 1.6)), 1.4, 'bp')
  const b = sweepSine(dur, (t) => 180 * Math.pow(4, Math.pow(t / dur, 1.5)), () => 1)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const u = i / n
    ph += (220 * Math.pow(4, Math.pow(u, 1.5))) / SR
    const saw = 2 * (ph % 1) - 1
    a[i] = (a[i] * 1.0 + b[i] * 0.12 + saw * 0.05) * Math.pow(u, 2.2)
  }
  return a
}
export function reverseCymbal(dur: number) {
  const c = crash(dur)
  c.reverse()
  return mulEnv(c, (t) => Math.pow(t / dur, 1.5))
}
export function impact(dur = 2.6) {
  const sub = sweepSine(dur, (t) => 30 + 45 * Math.exp(-t / 0.25), (t) => Math.min(1, t / 0.003) * Math.exp(-t / 0.9))
  const nz = svf(mulEnv(noise(S(dur)), (t) => Math.exp(-t / 0.35)), (i) => 5000 * Math.exp(-i / SR / 0.25) + 150, 0.7)
  const k = kick(1)
  for (let i = 0; i < sub.length; i++) sub[i] = Math.tanh(sub[i] * 1.4 + nz[i] * 0.55 + (k[i] ?? 0) * 0.5)
  return sub
}
export const pop = (f0: number, f1: number, dur = 0.09, tau = 0.03) => sweepSine(dur, (t) => f1 + (f0 - f1) * Math.exp(-t / 0.012), (t) => Math.min(1, t / 0.0015) * Math.exp(-t / tau))
export const bloop = (f0: number, f1: number, dur = 0.22) => sweepSine(dur, (t) => f0 * Math.pow(f1 / f0, Math.min(1, t / 0.08)), (t) => Math.min(1, t / 0.004) * Math.exp(-t / 0.06))
export function click(bright = 1) {
  const n = S(0.05)
  const a = svf(mulEnv(noise(n), expd(0.0018)), 3200 * bright, 1.2, 'bp')
  const b = svf(mulEnv(noise(n), (t) => (t > 0.028 ? Math.exp(-(t - 0.028) / 0.0015) : 0)), 2600 * bright, 1.2, 'bp')
  const c = sweepSine(0.05, () => 1800 * bright, expd(0.004))
  for (let i = 0; i < n; i++) a[i] = a[i] * 1.4 + b[i] * 0.8 + c[i] * 0.25
  return a
}
export function keyTick(r: () => number) {
  const n = S(0.04)
  const a = svf(mulEnv(noise(n, r), expd(0.004)), 2200 + r() * 1800, 1.5, 'bp')
  const th = sweepSine(0.04, () => 220 + r() * 60, expd(0.008))
  for (let i = 0; i < n; i++) a[i] = a[i] * 1.2 + th[i] * 0.35
  return a
}
export const tick = (f = 4200, tau = 0.006) => sweepSine(0.03, () => f, (t) => Math.min(1, t / 0.0005) * Math.exp(-t / tau))
export function swoosh(dur = 0.22, up = true) {
  return whoosh(dur, up ? 700 : 5000, up ? 5500 : 600, 1.4, 0.65)
}
export function thump() {
  const s = sweepSine(0.35, (t) => 70 + 90 * Math.exp(-t / 0.03), (t) => Math.min(1, t / 0.004) * Math.exp(-t / 0.09))
  const w = whoosh(0.18, 300, 1400, 0.9, 0.3)
  for (let i = 0; i < w.length; i++) s[i] += w[i] * 0.25
  return s
}
export function sparkle(t0: number, notes: number[], step: number, gain: number, panSpread = 0.6) {
  notes.forEach((nt, k) => place(B.sfx, bell(nt, 1.6), t0 + k * step, gain * Math.pow(0.86, k), ((k % 2 ? 1 : -1) * panSpread * (k + 1)) / notes.length, { verb: 0.5, delay: 0.35 }))
}


// ═════════════════════════════════════════════════════════════════════════════
// MIX · sidechain duck on every kick, ping-pong delay, freeverb, glue compressor,
// soft clip, fades → out/audio_raw.wav. finalize.sh then sets −14 LUFS / −1 dBTP.
// ═════════════════════════════════════════════════════════════════════════════
function duck(kicks: number[], depth: number, tau = 0.09) {
  const g = new Float32Array(LEN).fill(1)
  for (const tk of kicks) {
    const i0 = Math.round(tk * SR)
    const n = S(0.45)
    for (let i = 0; i < n && i0 + i < LEN; i++) {
      const t = i / SR
      g[i0 + i] *= 1 - depth * Math.min(1, t / 0.004) * Math.exp(-t / tau)
    }
  }
  return g
}
// Ping-pong delay, dotted 8th at 120 BPM.
function pingPong(inp: St, time = 0.375, fb = 0.38) {
  const d = S(time)
  const out = bus()
  const bl = new Float32Array(d), br = new Float32Array(d)
  let idx = 0, lpL = 0, lpR = 0
  const a = Math.exp((-TAU * 4200) / SR)
  for (let i = 0; i < LEN; i++) {
    const yl = bl[idx], yr = br[idx]
    lpL = (1 - a) * yl + a * lpL
    lpR = (1 - a) * yr + a * lpR
    bl[idx] = inp.R[i] + lpR * fb
    br[idx] = inp.L[i] + lpL * fb
    out.L[i] = yl
    out.R[i] = yr
    if (++idx >= d) idx = 0
  }
  return out
}
function freeverb(inp: St, room = 0.86, damp = 0.28) {
  const sc = SR / 44100
  const CT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
  const AT = [556, 441, 341, 225]
  const mk = (off: number) => ({
    combs: CT.map((c) => ({ b: new Float32Array(Math.round((c + off) * sc)), i: 0, f: 0 })),
    aps: AT.map((c) => ({ b: new Float32Array(Math.round((c + off) * sc)), i: 0 })),
  })
  const ch = [mk(0), mk(23)]
  const out = bus()
  const pre = S(0.025)
  const inL = svf(svf(inp.L, 220, 0.7, 'hp'), 7000, 0.7)
  const inR = svf(svf(inp.R, 220, 0.7, 'hp'), 7000, 0.7)
  for (let i = 0; i < LEN; i++) {
    const j = i - pre
    const x = j >= 0 ? (inL[j] + inR[j]) * 0.015 : 0
    for (let c = 0; c < 2; c++) {
      const st = ch[c]
      let s = 0
      for (const cb of st.combs) {
        const y = cb.b[cb.i]
        cb.f = y * (1 - damp) + cb.f * damp
        cb.b[cb.i] = x + cb.f * room
        if (++cb.i >= cb.b.length) cb.i = 0
        s += y
      }
      for (const ap of st.aps) {
        const b = ap.b[ap.i]
        const y = -s + b
        ap.b[ap.i] = s + b * 0.5
        if (++ap.i >= ap.b.length) ap.i = 0
        s = y
      }
      ;(c ? out.R : out.L)[i] = s
    }
  }
  return out
}

type MixOpts = {
  kicks: number[] // every kick time: drives the sidechain duck
  sections?: [string, number, number][] // for the REPORT=1 stem table
  gains?: Partial<Record<'drums' | 'bass' | 'music' | 'pad' | 'sfx' | 'delay' | 'verb', number>>
}
export function mixdown({ kicks, sections = [], gains = {} }: MixOpts) {
  const dBass = duck(kicks, 0.8, 0.1), dPad = duck(kicks, 0.45, 0.12), dMus = duck(kicks, 0.25, 0.1), dFx = duck(kicks, 0.2, 0.12)
  const dl = pingPong(B.delay)
  for (let i = 0; i < LEN; i++) {
    B.verb.L[i] += dl.L[i] * 0.3
    B.verb.R[i] += dl.R[i] * 0.3
  }
  const rv = freeverb(B.verb)
  const G = { drums: 0.85, bass: 0.9, music: 1, pad: 1, sfx: 1.55, delay: 0.55, verb: 2.4, ...gains }
  const L = new Float32Array(LEN), R = new Float32Array(LEN)
  for (let i = 0; i < LEN; i++) {
    L[i] = B.drums.L[i] * G.drums + B.bass.L[i] * G.bass * dBass[i] + B.music.L[i] * G.music * dMus[i] + B.pad.L[i] * G.pad * dPad[i] + B.sfx.L[i] * G.sfx + dl.L[i] * G.delay * dFx[i] + rv.L[i] * G.verb * dFx[i]
    R[i] = B.drums.R[i] * G.drums + B.bass.R[i] * G.bass * dBass[i] + B.music.R[i] * G.music * dMus[i] + B.pad.R[i] * G.pad * dPad[i] + B.sfx.R[i] * G.sfx + dl.R[i] * G.delay * dFx[i] + rv.R[i] * G.verb * dFx[i]
  }
  // REPORT=1 bun audio.ts → RMS (dBFS) of each stem per section: the only way to
  // "hear" the balance (e.g. SFX buried under the music, a section too hot).
  if (process.env.REPORT && sections.length) {
    const stems: Record<string, (i: number) => number> = {
      drums: (i) => B.drums.L[i] + B.drums.R[i],
      bass: (i) => (B.bass.L[i] + B.bass.R[i]) * G.bass * dBass[i],
      music: (i) => (B.music.L[i] + B.music.R[i]) * dMus[i],
      pad: (i) => (B.pad.L[i] + B.pad.R[i]) * dPad[i],
      sfx: (i) => (B.sfx.L[i] + B.sfx.R[i]) * G.sfx,
      delay: (i) => (dl.L[i] + dl.R[i]) * G.delay * dFx[i],
      verb: (i) => (rv.L[i] + rv.R[i]) * G.verb * dFx[i],
      total: (i) => L[i] + R[i],
    }
    const rows = [['stem', ...sections.map((x) => x[0])].map((x) => x.padStart(8)).join(' ')]
    for (const [k, f] of Object.entries(stems)) {
      const cells = sections.map(([, a, b]) => {
        let acc = 0
        const i0 = S(a), i1 = Math.min(LEN, S(b))
        for (let i = i0; i < i1; i++) acc += (f(i) / 2) ** 2
        return (10 * Math.log10(acc / (i1 - i0) + 1e-12)).toFixed(1)
      })
      rows.push([k, ...cells].map((x) => x.padStart(8)).join(' '))
    }
    console.log(rows.join('\n'))
  }
  // Master: rumble high-pass, glue compressor, soft clip, fades.
  const mL = svf(L, 28, 0.7, 'hp'), mR = svf(R, 28, 0.7, 'hp')
  {
    let env = 0
    const at = Math.exp(-1 / (0.01 * SR)), rl = Math.exp(-1 / (0.15 * SR))
    const thr = db(-14), ratio = 2.2
    for (let i = 0; i < LEN; i++) {
      const lvl = Math.max(Math.abs(mL[i]), Math.abs(mR[i]))
      env = lvl > env ? at * env + (1 - at) * lvl : rl * env + (1 - rl) * lvl
      const gr = env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1
      mL[i] *= gr
      mR[i] *= gr
    }
  }
  let peak = 0
  for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(mL[i]), Math.abs(mR[i]))
  const pre = db(-3) / peak
  const fade = (t: number) => {
    const fi = Math.min(1, t / 0.3)
    const fo = t < T.fadeOut[0] + 0.2 ? 1 : Math.max(0, 1 - (t - T.fadeOut[0] - 0.2) / (T.fadeOut[1] - T.fadeOut[0] - 0.2))
    return fi * fo
  }
  for (let i = 0; i < LEN; i++) {
    const f = fade(i / SR)
    mL[i] = Math.tanh(mL[i] * pre * 1.25) * 0.9 * f
    mR[i] = Math.tanh(mR[i] * pre * 1.25) * 0.9 * f
  }
  const outPath = new URL('./out/audio_raw.wav', import.meta.url).pathname
  wav(outPath, mL, mR)
  console.log(outPath, `peak before master ${peak.toFixed(2)}`)
}

function wav(file: string, l: Float32Array, r: Float32Array) {
  const n = l.length
  const buf = Buffer.alloc(44 + n * 6)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 6, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 6, 28)
  buf.writeUInt16LE(6, 32)
  buf.writeUInt16LE(24, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 6, 40)
  let o = 44
  for (let i = 0; i < n; i++) {
    for (const v of [l[i], r[i]]) {
      const s = Math.max(-8388608, Math.min(8388607, Math.round(v * 8388607)))
      buf.writeIntLE(s, o, 3)
      o += 3
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, buf)
}
