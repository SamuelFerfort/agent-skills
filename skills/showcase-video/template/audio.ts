// Soundtrack: an original 120 BPM track plus every UI/transition sound, scheduled
// from the same timeline as the visuals. `bun audio.ts` → out/audio_raw.wav;
// `REPORT=1 bun audio.ts` also prints each stem's level per section.
// This file is the per-video part: harmony, arrangement, SFX. The engine is synth.ts.
import { T, SCENES, QUESTION, ANSWER, badgeTimes, typingTimes, mulberry32 } from './timeline.js'
import { B, place, placeSt, kick, clap, hat, crash, snare, padChord, pluck, bassNote, mallet, bell, whoosh, riser, reverseCymbal, impact, pop, click, keyTick, tick, sparkle, mixdown } from './synth.ts'

// ── harmony · one chord per bar (2 s) ────────────────────────────────────────
// G minor → resolves to B♭ on the end card. Pick a key per video; minor → relative
// major at the end gives the "arrival" feeling under the logo.
const CH: Record<string, { root: number; pad: number[]; arp: number[] }> = {
  Gm: { root: 43, pad: [58, 62, 67, 70], arp: [67, 70, 74, 79] },
  Eb: { root: 39, pad: [58, 63, 67, 70], arp: [67, 70, 75, 79] },
  Bb: { root: 46, pad: [58, 62, 65, 70], arp: [65, 70, 74, 77] },
  F: { root: 41, pad: [57, 60, 65, 69], arp: [65, 69, 72, 77] },
}
const PROG = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Bb'] // bars 0–5
const DROP = T.ui // groove starts on the product scene
const END = T.end

// Intro: pad opens its filter while the logo draws; groove bars get a steady pad.
for (let b = 0; b < PROG.length; b++) {
  const t0 = b * 2
  const intro = t0 < DROP
  const last = b === PROG.length - 1
  const cut = (t: number) => (intro ? 500 + 2000 * Math.pow((t0 + t) / DROP, 1.6) : last ? 3200 - 1400 * Math.min(1, t / 2) : 2800)
  placeSt(B.pad, padChord(CH[PROG[b]].pad, last ? 2.2 : 2, { atk: b === 0 ? 1.2 : 0.2, rel: last ? 1.6 : 0.5, cut }), t0, intro ? 0.4 : 0.3, { verb: 0.3 })
}
// Arp in 16ths from bar 1; a breath (silence) just before the drop.
const ARP = [0, 2, 1, 3, 2, 0, 3, 1, 0, 2, 1, 3, 2, 3, 1, 2]
for (let s = 0; s * 0.125 < END; s++) {
  const t = s * 0.125
  if (t < 2 || (t >= DROP - 0.25 && t < DROP)) continue
  const ch = CH[PROG[Math.floor(t / 2)]]
  const bright = t < DROP ? 0.2 + 0.8 * ((t - 2) / (DROP - 2)) : 1
  place(B.music, pluck(ch.arp[ARP[s % 16]], s % 4 ? 0.65 : 1, bright), t, 0.2, s % 2 ? 0.35 : -0.35, { delay: 0.3, verb: 0.15 })
}
for (let b = DROP / 2; b < END / 2; b++) place(B.bass, bassNote(CH[PROG[b]].root, 2), b * 2, 0.5)
place(B.bass, bassNote(CH.Bb.root - 12, 2, false), END, 0.5)

// Drums: four-on-the-floor through the product scene.
const kicks: number[] = []
for (let t = DROP; t < END - 0.01; t += 0.5) kicks.push(t)
for (const t of kicks) place(B.drums, kick(), t, 0.55)
for (let t = DROP + 0.5; t < END; t += 1) place(B.drums, clap(), t, 0.26, 0.05, { verb: 0.2 })
{
  const hr = mulberry32(99)
  for (let t = DROP; t < END; t += 0.25) {
    const i = Math.round(t * 4) % 4
    if (i === 2) place(B.drums, hat(true), t, 0.09, 0.25)
    else place(B.drums, hat(), t, [0.11, 0.05, 0, 0.07][i] * (0.85 + 0.3 * hr()), -0.25)
  }
  for (let t = DROP - 1.5, g = 0.05; t < DROP - 0.25; t += 0.125, g += 0.012) place(B.drums, snare(190 + (t - DROP) * 40), t, g, 0, { verb: 0.25 })
}

// ── transitions: every cut gets a sound; big moments get riser → impact ──────
placeSt(B.sfx, { L: riser(1.4), R: riser(1.4) }, DROP - 1.4, 0.22)
place(B.sfx, reverseCymbal(0.8), DROP - 0.8, 0.28)
place(B.sfx, impact(), DROP, 0.4, 0, { verb: 0.2 })
place(B.drums, crash(), DROP, 0.25, 0.2, { verb: 0.3 })
place(B.sfx, whoosh(0.5, 400, 3500, 1.2, 0.7), T.s1Out[0], 0.2, 0, { verb: 0.3 })
place(B.sfx, whoosh(0.45, 3000, 500, 1.2, 0.4), T.s2Out[0], 0.16, 0, { verb: 0.3 })
place(B.sfx, reverseCymbal(1.0), END - 1.0, 0.3)
place(B.sfx, impact(3.0), END, 0.7, 0, { verb: 0.45 })
place(B.drums, crash(2.6), END, 0.25, 0, { verb: 0.45 })

// ── S1 · the logo draws: a rising run of glassy plucks, a bell when it fills ──
;[62, 65, 67, 70, 74, 77, 79].forEach((n, i) => place(B.music, pluck(n, 0.8, 0.5), T.draw[0] + i * 0.14, 0.13, -0.5 + i * 0.16, { verb: 0.4, delay: 0.3 }))
place(B.sfx, bell(79, 2.4), T.draw[1] - 0.2, 0.12, 0, { verb: 0.5 })
for (let i = 0; i < 6; i++) place(B.sfx, tick(2800 + i * 260, 0.01), T.word + i * 0.06, 0.08, -0.4 + i * 0.15, { verb: 0.25 })

// ── S2 · UI: a key tick per character, click on send, a pop per citation ─────
{
  const kr = mulberry32(5)
  for (const t of typingTimes(QUESTION, T.type[0], T.type[1])) place(B.sfx, keyTick(kr), t, 0.1 + kr() * 0.04, (kr() - 0.5) * 0.4)
}
place(B.sfx, click(), T.send - 0.02, 0.35, 0.3)
place(B.sfx, pop(1400, 800, 0.1, 0.03), T.send + 0.05, 0.14, 0.3, { verb: 0.2 })
badgeTimes(ANSWER, T.answer[0], T.answer[1]).forEach((t, i) => place(B.sfx, pop(1200 + i * 150, 700 + i * 60, 0.09, 0.025), t, 0.12, -0.3 + i * 0.3, { verb: 0.2 }))

// ── S3 · end card ─────────────────────────────────────────────────────────────
sparkle(T.end + 0.1, [82, 86, 89, 94], 0.09, 0.08)
place(B.music, mallet(82, 1.6), T.endTag, 0.12, 0.1, { verb: 0.4, delay: 0.3 })

mixdown({ kicks, sections: SCENES })
