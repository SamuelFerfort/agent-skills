# Quality loop: rubric, reviewer, exit criteria

After the plan is approved, quality comes from this loop, not from asking the user. Every
defect it catches is one the user won't have to find. In past productions, the user
found these in delivered cuts:

- a jump at a scene handoff;
- a hover card that never appeared;
- badge numbers off-centre;
- a speech bubble cut by the frame;
- a stray yellow artifact;
- a UI element the product doesn't have;
- store badges at different sizes.

All of them are visible in a contact sheet or a filmstrip. The loop exists to look.

## Contents
1. The iteration
2. Rubric (severity definitions)
3. Reviewer prompt
4. LOOP.md
5. Exit criteria and when to stop

---

## 1. The iteration

```
build / fix ─► node render.mjs review [--scene id] ─► read the pack yourself ─► fix the obvious
      ▲                                                                              │
      └──────── fix blockers + majors, log them ◄── fresh reviewer (subagent) ◄──────┘
```

- **Per scene (fast).** `review --scene id`, then your own check against the storyboard
  and the rubric. Repeat until clean. Then the next scene.
- **Whole film.** `review` (all scenes and all planned cuts), then a fresh reviewer.
  Repeat until the exit criteria are met.
- **Final file.** `qa.py` on the finalized mp4. Resolve every flagged moment (fix it, or
  add it to `INTENDED`), and give the reviewer the 1 fps sheet of the file. Repeat until
  qa.py exits 0.

The review pack in `out/review/<tag>/` contains:
- `scene-<id>.png`: the whole scene at ≤ 0.25 s steps;
- `cut-<t>.png`: ±0.3 s around each planned cut at 0.05 s;
- `lint.md`: text partly outside the frame, and page errors.

Add full-size `preview` stills for detail-heavy moments: hovers, modals, badges, the end
card.

## 2. Rubric

For each item, the reviewer assigns **blocker** (can't ship), **major** (a viewer would
notice) or **minor** (polish).

| Area | Blocker | Major | Minor |
|---|---|---|---|
| Continuity | A jump or pop at a cut or mid-scene. A flash of the wrong scene. An element teleporting. | A mismatch between the last frame of A and the first of B (position, scale). A transition that stalls. | Easing that feels abrupt. |
| Framing | Important text or UI cut by the frame or its container. Empty stage visible outside the app. | Crowded or unbalanced composition. Key element too small to read at 1080p. | Uneven margins. |
| Fidelity | Wrong logo, brand name or theme. A feature or element the product doesn't have. | UI details off (spacing, radii, icon set, strings not the product's). | Tiny token mismatch. |
| Truth | A false or unverified claim, number or law on screen. | A misleading example. | |
| Readability | Text on screen for less than ~0.4 s per word + 0.5 s. Two things to read at once. | Low contrast. Text over busy motion. | Awkward line breaks. |
| Story | A scene that doesn't match the approved storyboard. The magic moment missing or buried. | A scene with no clear point. Pacing monotony (same framing more than ~6 s, same layout repeated). | |
| Craft | Rendering artifacts (stray shapes, broken glyphs, missing fonts). | Off-centre badge text, misaligned icons, jittery motion. | |
| Sameness | Reads like a past video with another logo (compare with the profile). | A signature device reused from a past video. | |

Audio is checked by numbers, not by ear. Check the stem report per scene: SFX audible in
UI scenes, no stem clipping. qa.py checks loudness and silences.

## 3. Reviewer prompt

Spawn a **fresh** subagent: general-purpose, or whatever is available. It must not
inherit your context: fresh eyes judge what is on screen, not what you intended. If
subagents aren't available, do the review yourself, strictly by the rubric, as if you
were seeing the film for the first time.

```
You are reviewing frames of a product video in production. You have not seen it before.
Judge only what is visible.

Storyboard (approved by the client):
<paste the storyboard table>

Product facts (what is real): <theme, brand name, key UI, what features exist>
Past videos of this brand/user (must not be repeated): <from the profile, or "none">

Review pack — read every image:
<list the absolute paths: scene-*.png, cut-*.png, lint.md, any previews>
Each tile is labelled with its time in seconds. Filmstrips show 0.05 s steps across a cut.

Use this rubric: <paste section 2 of quality-loop.md>

Report ONLY defects, most severe first, one per line:
<severity> · <time or range> · <area> · <what is wrong> · <suggested fix>
Then one line: "Verdict: ship" if there are no blockers or majors, otherwise "Verdict: fix".
Do not praise. Do not restate the storyboard. If a tile is ambiguous, say what you'd need
to see (e.g. "full-size preview at 18.4").
```

Feed back any preview it asks for and let it re-judge that point.

## 4. LOOP.md

Keep it in `src/`, newest entry last:

```
## Iteration 4 · whole-film review · 2026-10-02 14:10
Reviewer: 1 blocker, 3 majors, 5 minors
- FIXED blocker 10.02 s continuity: input box drops 20 px when the thread appears → thread pre-laid-out at rest
- FIXED major 18.4 s craft: citation digits off-centre → line-height 1 on the badge
- FIXED major 44.9 s readability: caption on screen 0.8 s for 9 words → held to 3.2 s, cue shifted
- WONTFIX minor 30.1 s: margin 4 px uneven (hidden by the camera push)
Next: re-review scenes cloud + hero; then render.
```

## 5. Exit criteria and when to stop

**The video is ready to deliver when:**
- the last whole-film review says "Verdict: ship" (no blockers or majors);
- `lint.md` has no unexplained entries;
- qa.py on the delivered mp4 exits 0;
- every fact on screen has a noted source.

**Don't ship on:**
- your own impression of a scene you haven't reviewed as images;
- a review of an earlier iteration (changes can break other scenes: re-review what you
  touched and every cut next to it).

**If it isn't converging:**
- the same defect across three rounds means changing the approach (re-layout, a
  different transition), not nudging numbers;
- more than ~8 whole-film rounds means stopping and reporting what's unresolved, with
  frames, rather than looping forever.

**Interrupt the user only for** an asset or fact only they can provide, or a brand or
legal risk. Everything else is your call, made from the plan, the rubric and the
profile.
