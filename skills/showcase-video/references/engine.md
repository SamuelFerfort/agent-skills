# Engine: rules, API, scene cookbook, pitfalls

## Contents
1. How it works
2. Project layout
3. A scene module
4. lib.js cheat sheet
5. Cookbook
6. Pitfalls (each one shipped once)

---

## 1. How it works

`index.html` is a fixed 1920×1080 stage (set `W`/`H` in `timeline.js` for other
aspects). `main.js` builds every scene once, then exposes `window.__seek(t)`, which sets
**every** style for time `t`. `render.mjs` loads the page in headless Chromium, seeks to
each `frame / FPS` and screenshots it through CDP. At dsf 2 that is 3840×2160,
lanczos-downscaled. The PNGs pipe into ffmpeg.

Because a frame depends only on `t`:
- frames can render in parallel, out of order, and in resumable segments;
- `?t=18.5` in a browser freezes exactly the frame the user complained about;
- audio scheduled from the same `timeline.js` lands on the exact frame.

The price: **nothing may depend on wall-clock time.** That rules out:
- CSS transitions and animations, and `animation-*`;
- `setTimeout`, `requestAnimationFrame` state, and `Date`;
- `Math.random()`: use `mulberry32(seed)` instead.

Motion is maths on `t`: easings, springs as closed-form step responses, and camera
keyframes.

## 2. Project layout

```
~/Videos/<product>-showcase/
  refs/                 reference sheets, refs.json, assets.png (asset sheet)
  src/                  the code (git; tag each delivered version)
    timeline.js         BPM, FPS, W, H, DURATION, T (every cue), SCENES (windows = planned cuts),
                        INTENDED (planned instant changes), texts, shared helpers
    lib.js              maths, easing, springs, tf(), text reveals, streaming, camera, cursor,
                        comet links, touch taps, grain
    logo.js             real logo draw-on (from assets/logo.json)
    LOOP.md             the production loop's log (iterations, findings, fixes)
    demo-*.js           the template's engine test — delete once your first scene renders
    s1-….js …           one module per scene
    main.js             orchestration, global layers (bg, fx canvas, flashes, grain, fade), __seek
    index.html          CSS (tokens, fonts, all scene styles) + empty <section>s
    synth.ts / audio.ts engine / arrangement + SFX
    render.mjs · render-segs.sh · watchdog.sh · finalize.sh
    trace_logo.py · gen-icons.mjs
    assets/             logo.json, icons.js, fonts/, images
    out/                renders, previews, sheets, review/<tag>/, qa/<name>/ (gitignored)
  v1/ v2/ …             deliverables per version (never overwritten)
```

## 3. A scene module

```js
import { T } from './timeline.js'
import { $, P, E, SP, show, tf } from './lib.js'
let root, card
export function build() {            // once: create DOM, ids/classes prefixed with the scene
  root = $('#s4')
  root.innerHTML = `<div class="s4-card">…</div>`
  card = $('.s4-card', root)
}
export function measure() { … }       // once, after fonts: read layout (getBoundingClientRect / local())
export function at(t) {              // every frame: set styles from t only
  if (!show(root, t >= T.s4 && t < T.s5)) return   // hidden outside its window = cheap frames
  const k = SP.bouncy(t - T.cardIn)
  tf(card, { y: (1 - k) * 80, s: 0.9 + 0.1 * k, o: P(t, T.cardIn, T.cardIn + 0.2, E.lin) })
}
```

Register it in `main.js` (`MODULES`), add a `<section id="s4" class="scene">`, and add its
window to `SCENES` in `timeline.js` (`['s4', T.s4, T.s5]`; append `{ montage: true }` for a
scene that cuts freely inside). Cues for instant changes you mean (a flash, a modal that
pops open) go in `INTENDED`, so QA doesn't flag them as jumps.

## 4. lib.js cheat sheet

| Helper | Use |
|---|---|
| `P(t, a, b, ease)` | 0→1 progress over [a, b], eased. The workhorse. |
| `E.*` | `outCubic`, `outExpo`, `inOutCubic`, `inExpo`, `swift`, `enter`… Add the product's curves via `bez(x1, y1, x2, y2)`. |
| `SP.*(dt)` | Spring step responses (`snappy`, `bouncy`, `soft`, `word`, `pop`). They overshoot, so use them for arrivals. |
| `tf(el, {x, y, s, r, rx, ry, persp, o, blur})` | Sets transform, opacity and blur in one call. |
| `show(el, on)` | display none/''. Returns `on`. |
| `linesHTML` / `riseWords` / `sinkWords` | Word-by-word headline reveals inside clipped lines. |
| `typed(text, a, b, t)` / `typingTimes` | Typing (audio uses the same times for key ticks). |
| `streamHTML(parts)` / `streamAt(root, a, b, t)` | Streamed answer. Words are fixed spans (no reflow); numbers become citation badges with a spinner that resolves after `lag`. `badgeTimes()` gives audio the pop times. |
| `camAt(keys, t)` + `applyCam(el, cam)` | Virtual camera: keys `[t, focusX, focusY, zoom]`, eased, with zoom in log space. Clamped so it never shows outside the stage at zoom ≥ 1. |
| `local(el, camEl)` / `centerOf(r)` | An element's rect in its camera's un-zoomed space (measure with the camera at rest). |
| `cursorAt(cur, ring, from, to, a, b, click, t)` | Cursor on a slight arc, press squash, click ring. |
| `makeLink(svg).at(t, a, b, t0, t1)` | A comet line from point a to b (phrase → field, citation → passage): trail, glowing head, arrival burst. The svg is a full-stage overlay inside the same camera. |
| `tapAt(el, t, x, y, at)` | A touch indicator for phones: presses in at `at`, then fades. Returns whether it's visible, so taps chain with `||`. |
| `ic(name)` | An inline icon from `assets/icons.js`. |
| `grainTiles` / `drawGrain` | Film grain (seeded per frame). |

## 5. Cookbook

- **Logo draw-on.**
  - `trace_logo.py` splits the logo into connected pieces and contour loops, and
    `makeLogo()` strokes the loops smallest-first, then fades in the fill.
  - For letters that should pop separately, pick their pieces by index (they sort by
    area) and animate them with `SP.pop`.
  - Check a preview: tracing polarity mistakes show as an inverted fill.
- **Headline → UI element.** Morph the text box into the composer: interpolate
  width, height and radius, and cross-fade the text into the placeholder.
- **Portal dive.** Scale a camera toward an element in the logo until it fills the
  frame, with the next scene visible *through* it (`clip-path` on the next scene's
  container).
  - **Centre the target at (960, 540) first**, computing the logo's offset from the
    element's position. Otherwise the zoom drifts and the next scene "jumps".
  - Hold the next scene's camera static until the portal finishes.
- **App shrinks into an element.** Animate the whole scene container from full size to
  the target's rect (`translate + scale`, `clip-path: inset(… round r)` growing the
  radius), then fade it in the last 0.15 s.
- **Typing, send, stream.**
  1. The cursor moves to send, clicks at `T.send`, and the composer empties.
  2. The user bubble springs in.
  3. Thinking dots and chain-of-thought steps appear (shimmer text via `shimmer()`).
  4. `streamAt` runs the answer, and the badges resolve.
- **Citation → source.** Hover card after a cursor rest, then a click on "go to
  source", then a viewer with the real document page. `scripts/pdf_passage.py` renders
  the page and gives the passage's line boxes. The highlight grows across them in the
  product's own colour.
- **Connecting lines** (phrase → field, badge → passage). Measure both ends in
  `measure()` (`centerOf(local(el, cam))`). Then create one `makeLink(svg)` per line and
  call `.at(t, a, b, t0, t1)` each frame. Stagger them on the 16th grid; audio can zip on
  departure and pluck on arrival.
- **Form autofill.** Each value lands with the product's own autofill flash (read its
  CSS) and an "AI" badge. Stagger 0.3 s apart, on the 16th-note grid.
- **Indexing metaphor.** Page thumbnails, a scan beam sweeping each one, fragment chips
  flying to a counter, then "Ready" and the document card settles back into the list.
- **Split view.** The answer on the left, the source document on the right, and lines
  from each badge to its highlighted passage.
- **Phone.**
  - Build it in device points (393×852 iPhone) inside a frame, then scale it (e.g.
    `424/393`).
  - Use the mobile app's theme, native sheets and camera UI.
  - Show touches with `tapAt` (a soft circle that presses in), since there is no
    cursor on a phone.
- **Store badges beat.** App icon, name and subtitle, then the official badges
  (`scripts/store_badges.sh`) at equal height. Land it on a drop.
- **Particles and sparks.** A canvas in `main.js` (`#fx`) with particles from a seeded
  PRNG, each a pure function of `t - t0`.
- **Flashes.** A radial-gradient layer whose opacity is `exp(-(t - hit) * 9)` at each
  hit.
- **End card.** Logo solid, name, one useful line, URL, then fade out to black over
  the last ~1.5 s.

## 6. Pitfalls (each one shipped once)

- **Duplicate DOM ids across scenes.** Two modules both used `#pin`. One scene styled
  the other's element: the page box went `position: absolute`, and a panel scrolled the
  wrong thing. Prefix every id and class with the scene (`s3-…`). `main.js` logs
  duplicate ids as page errors, which fails the render.
- **Duplicate keys in `T`.** A later `card:` silently replaced an earlier one, so a
  hover card never appeared and the cursor flew to a corner. `render.mjs` warns on
  duplicates. Give keys scene-specific names (`cardOpen`, not `card`).
- **`show()` resets inline `display`.** An element with `style="display:flex"` loses it
  the first time it is shown. Put layout display in CSS classes, or wrap the content in
  an inner div.
- **`classList.toggle(cls, undefined)` toggles** on every frame, so it flickers. Always
  pass a boolean (`!!x`).
- **Camera `transform-origin`.** `applyCam` sets `0 0`. If you animate a camera some
  other way, the CSS default (centre) drifts the frame.
- **Camera beyond the stage.** At zoom ≥ 1, clamp the focus (`applyCam` does). A push
  toward an edge otherwise shows empty space outside the app.
- **Jumps at scene boundaries.** Both videos had one: a camera or portal centre that
  didn't match between scenes, or an input that moved when the thread appeared. Take a
  filmstrip at 0.05 s steps across every cut, and check that the last frame of A lines
  up with the first frame of B. `qa.py` flags jumps on the rendered file automatically.
- **Measuring per frame.** `getBoundingClientRect` inside `at()` is slow and, under a
  moving camera, wrong. Measure once in `measure()`, with the camera at rest.
- **Measuring hidden elements.** `getBBox` and `getBoundingClientRect` return 0 under
  `display: none`. Build and measure before the first `seek`, while every section is
  still visible.
- **Clipping.** Speech bubbles or cards cut off by the frame or an `overflow: hidden`
  parent. Check the edges in the contact sheets.
- **Fonts.** They must be local woff2 and awaited (`document.fonts.ready`). A network
  font can render in the fallback on some frames.
- **Heavy DOM.** Hide scenes outside their window with `show()`. Big offscreen images
  still cost memory, so size assets to their display size × 2.
