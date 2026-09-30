# Audio: arrangement, SFX vocabulary, mix checks

`synth.ts` is the engine: buses, `place()`, drums, pads, plucks, FM bells and mallets,
bass, vocal chops, whooshes, risers, impacts, UI clicks, delay, reverb, sidechain, the
master and a WAV writer. `audio.ts` is the per-video part: harmony, arrangement and
SFX, all scheduled from `timeline.js`. Everything is generated from maths: no samples,
no third-party music, nothing to license. If the user asks where the music comes from,
that is the answer.

You cannot listen. Everything below is about making the music right by construction,
then checking it with measurements. Say so when you deliver. Offer a licensed track at
120 BPM (Artlist, Epidemic…) as a drop-in if the synth sound doesn't convince them:
the cuts already sit on its grid.

## Arrangement

- **Grid.** 120 BPM: beat 0.5 s, bar 2 s, 16th note 0.125 s. Put every scene boundary
  and big hit on a bar line, and UI events on the 16th grid where possible.
- **Harmony.** Write one chord per bar in `PROG`. A minor loop that resolves to its
  relative major on the end card gives the logo a feeling of arrival (e.g. Gm–E♭–B♭–F → B♭,
  or Fm–D♭–A♭–E♭ → A♭). Use a different key, tempo feel and lead sound from the
  profile's past videos. Match the product's tone: sparse and warm for calm products,
  driving for urgent ones.
- **Arc** (map it to the storyboard):
  - **Intro.** A pad opening its filter plus a sparse arp while the logo draws. No kick.
  - **Drop.** Kick, clap and hats on the first product scene, with a crash and impact
    on the downbeat.
  - **Leave room under UI-heavy scenes.** Drop the arp gain and keep a mid-range melody
    out of the way.
  - **Melody hook.** Give the most important feature scene a short motif (FM mallet).
  - **Breakdown.** Under a calm, "wow" scene (a hero or metaphor): drums out, arp in
    8ths.
  - **Build.** A snare roll plus a riser plus the pad filter opening, then drop 2.
  - **End card.** Resolve the chord, impact, crash, sparkle, and a long release into the
    fade.
- **Breaths.** Silence the arp for the last 16th or two before each drop; the drop hits
  harder.
- **Transitions.** Riser (length = gap to the hit) → reverse cymbal → impact + crash on
  the downbeat.

## SFX vocabulary (what worked)

| Event | Sound | Notes |
|---|---|---|
| Typing | `keyTick(r)` per character | Skip spaces and ~20% of keys at random so it sounds human. |
| Click / press | `click()` 30 ms before the visual press | Humans hear the click slightly before they see it. |
| Send / submit | `click` + `swoosh(0.26, true)` | |
| Thinking dots, tool start | `bloop(380–420 → 800–900)` | Delay send. |
| Step done, search found | `tick` + a high `bell` | |
| Streaming text | Random soft `tick`s on 16ths | Very low gain (~0.02). |
| Citation badge resolves | `pop` per badge, pitch rising | `badgeTimes()` gives the times. |
| Hover card, popover | `tick` on hover, `pop` (rising) on open | |
| Modal / viewer opens | `whoosh(500 → 3800)` + `thump()` | Closing is the reverse whoosh. |
| Searching or scanning | `fm` pulses every 16th, panned by `sin(t)` | |
| Highlight grows | Narrow `whoosh` over its duration + bell at the end | |
| Extraction (datum flies to field) | `whoosh` zip as it leaves + `pluck` from the current chord's arp as it lands | The landings play a melody in key. |
| Recording start / stop | Two short sines up (880 → 1318 Hz) / down | |
| Mobile tap | Soft glassy tap (`pop` + quiet `click`) | |
| Camera shutter | Two quick band-passed noise clicks, 70 ms apart | |
| Words appearing on the end card or wordmark | A run of `tick`s rising in pitch, 55 ms apart | |
| Logo draws | A glissando of plucks up the scale, then a bell or swell as the fill lands | |
| Big transition (portal, drop) | `riser` → `impact` + `crash` | |
| Success / done | `sparkle(t, [notes], step)` | Bells in key, ping-pong delay. |

Keep SFX panned subtly towards where the action is on screen (−0.4…0.4).

## Mix checks

- `REPORT=1 bun audio.ts` prints each stem's RMS per section:
  - **In UI scenes,** SFX should sit within about 6–10 dB of the total. More than
    ~12 dB below and the clicks disappear under the music.
  - **Bass at −120** in a section means it's intentionally out.
- The master is normalized by finalize.sh to −14 LUFS integrated with true peak
  ≤ −1.1 dBTP, by linear gain only. Loudnorm's dynamic mode would flatten the
  intro-to-drop contrast.
- For a quick visual sanity check, draw a spectrogram:

  ```bash
  ffmpeg -i out/audio_raw.wav -lavfi showspectrumpic=s=1600x500:legend=1:scale=log out/spec.png
  ```

  Look for mud (energy piling up at 200–400 Hz), harshness (a solid bar at 2–5 kHz)
  and silent gaps you didn't intend.
- **Clipping.** "peak before master" is printed. The master soft-clips (`tanh`), but a
  peak far above 1 means something is stacking. Find it in the stem report.

## Voice

Don't add a voiceover or spoken lines unless the user asks. On-screen text plus music
works everywhere (muted autoplay, any language), and a synthetic voice was rejected in a
past production. If they do ask, generate the takes first and derive
the timeline cues from the real take durations. Duck the music under the voice (a bus
with its own sidechain).
