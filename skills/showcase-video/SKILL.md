---
name: showcase-video
description: Make polished motion-design product videos (launch, promo, showcase, teaser, demo reel) entirely in code. Scenes are frame-exact HTML rendered with headless Chromium and ffmpeg, with an original synthesized soundtrack and SFX synced to one timeline. It researches reference launch videos and the real product's UI and brand, then proposes distinct concepts rooted in that product. The user approves one plan (storyboard and assets). After that it produces autonomously in a build → review → fix loop, with an independent reviewer and automated QA, until the video passes. Use it whenever someone asks for a promo, launch, showcase, explainer or motion-design video, an animated demo of their app or SaaS, "un vídeo promocional / de lanzamiento", or to fix or iterate on one of these videos, even if they never say "motion design".
---

# Showcase video

This skill makes a 30–90 s product film in code. Every frame is a pure function of time
(`window.__seek(t)`), and the music and SFX are synthesized from the same timeline. So
sound lands on the exact frame, renders are repeatable, and any feedback at a timestamp
can be reproduced at that timestamp.

The work has two halves:

- **Plan, with the user.** Research, then three distinct directions, a storyboard and an
  asset sheet. The user gives **one approval**.
- **Produce, autonomously.** Build → review → fix, repeated until an independent review
  and automated QA both pass. Then deliver. Don't come back with questions in between.
  Interrupt only for a true blocker: an asset only the user has, a claim you can't
  verify, or a brand or legal risk.

**Requirements:**
- Node ≥ 20 and bun;
- ffmpeg;
- ImageMagick 7;
- Playwright with `chromium-headless-shell`;
- uv, for logo tracing;
- yt-dlp, for references;
- poppler, for documents.

It runs on Linux and macOS (Windows through WSL). `scripts/new_project.sh` reports
anything missing.

## 0 · Profile

Read `${SHOWCASE_PROFILE:-~/.config/showcase-video/profile.md}` if it exists. It holds:

- **Preferences:** this user's standing taste, learned from their feedback on earlier
  videos. It overrides the defaults at the end of this file.
- **Past videos:** each one's concept, structure, devices and music. The new video must
  not repeat them.

Create or update the file at delivery (step 5).

## 1 · Brief

Take what you can from context and ask only the unknowns:

- the product (repo, URL, app);
- the audience;
- where it will play: web hero, social, chat apps, an event screen. This sets aspect
  (`W`/`H`) and length;
- the on-screen language (the product's own);
- the features that matter most.

## 2 · Research (parallel tracks)

- **Reference films.** How good launches are made. Pick 4–6. Use
  `scripts/analyze_refs.py search …`, then `analyze <project>/refs name=<url|id|file> …`.
  That writes measured cuts, shot lengths, light/dark share and a loudness curve, plus
  timestamped contact sheets. **Look at every sheet.** Distil techniques, not scenes to
  copy.
- **The real product.** Send parallel Explore agents to its source:
  - theme tokens (the dark theme if it has one);
  - real strings;
  - the components of the flows you'll show;
  - logo files, icon set, fonts, easing constants;
  - existing animations worth rebuilding;
  - store presence;
  - realistic data.

  Read from the default branch without touching the user's working tree (`git show
  main:path`). Never check out, stash or reset their branch.
- **The product's visual DNA.** This is where originality comes from. From the research,
  list:
  - the shapes in its logo;
  - its signature UI moments;
  - the verb at its core (search, cite, fill, draft, predict…);
  - its "magic moment": the instant a user thinks "oh";
  - its domain's imagery;
  - a metaphor for the invisible work it does.

  Different products yield different films because this list differs.

Details and checklists are in `references/research.md`.

## 3 · The plan ✋ (the one approval)

Present everything in one message:

1. **Three directions,** genuinely different in structure, not just in colour. Examples:
   one continuous camera through a single world; a cut-driven film alternating
   typography with isolated UI; a metaphor-led story built from the logo's shapes. For
   each, give:
   - a one-line logline;
   - the core metaphor;
   - the structure;
   - which reference techniques and which DNA items it uses;
   - why it fits this product.

   Recommend one.
2. **Storyboard for the recommended direction,** on a 120 BPM grid (bar = 2 s, cuts on
   bar lines), with the musical arc (intro, drop, breakdown, build, drop 2, resolve):

   | Bars / time | Scene | Shot | What happens (real UI piece) | Into next | Sound |
   |---|---|---|---|---|---|
3. **Asset sheet.** `scripts/asset_sheet.sh <project>/refs/assets.png "file|label · source" …`
   shows every visual asset with its origin:
   - the logo file;
   - official store badges (`scripts/store_badges.sh`);
   - generated vs real imagery;
   - fonts and colour swatches;
   - screens you'll rebuild.

   Look at it yourself first.
4. **Open questions,** only if their answer changes the film.

**Before sending, run a sameness check.** Compare the recommended direction's opening,
structure and signature devices against the profile's past videos and the case studies
in `references/research.md`. If it would read as the same film with another logo,
change it. The demo template (logo draw → app window → end card) is an engine test, not
a structure: don't propose it.

Say explicitly that after approval you'll produce the whole video autonomously and come
back when it passes review.

## 4 · Produce: the autonomous loop

Keep a log at `src/LOOP.md`: one entry per iteration with what was built, what the
review found, what was fixed, and what's next. It makes the loop auditable, and it lets
you resume after a context reset.

1. **Set up.**
   - `scripts/new_project.sh ~/Videos/<product>-showcase` copies `template/`, a working
     12 s demo, into `src/` with git.
   - Run the smoke test it prints.
   - Put in the real brand:
     - `uv run trace_logo.py <logo> assets/logo.json`;
     - `node gen-icons.mjs <repo> icon…`;
     - the product's fonts as woff2;
     - its tokens into `:root`.
   - Write `timeline.js`: `T` cues, the `SCENES` windows, and `INTENDED` (planned
     instant changes).
   - Delete the `demo-*.js` scenes once the first real scene renders.
2. **Scene by scene.** Build it, then run `node render.mjs review --scene <id>`. That
   writes a sheet of the scene, filmstrips across its cuts, and a lint of text cut off by
   the frame. Read the images against the storyboard and
   `references/quality-loop.md`'s rubric. Fix and repeat until the scene is clean, then
   move on. The engine rules and pitfalls are in `references/engine.md`. **Read its
   pitfalls section before the first scene.**
3. **Whole-film review round.** Run `node render.mjs review`. Then have a **fresh
   subagent** review the pack against the storyboard and the rubric, using the prompt in
   `references/quality-loop.md`. A fresh reviewer judges what is on screen, not what you
   meant. It returns defects with timestamps and severities. Fix every blocker and major,
   log them, and repeat.
   - **Exit** when the reviewer reports no blocker or major and the lint is clean.
   - **Stuck?** If one issue survives three rounds, change the approach instead of
     nudging values.
4. **Audio,** once the timing is stable. Run `bun audio.ts` and
   `REPORT=1 bun audio.ts` (stem levels per scene). See `references/audio.md`.
5. **Render and QA.**
   - `./render-segs.sh <name> 2 2` is resumable and watchdog-guarded. Run it in the
     background.
   - `SRC=out/<name>.mkv NAME=… DEST=../vN ./finalize.sh` produces the master, web and
     share files.
   - `python3 <skill>/scripts/qa.py ../vN/<name>.mp4 .` checks:
     - frames, resolution, colour, loudness;
     - every **unplanned** discontinuity (jumps, pops) and near-black stretch, each with
       a filmstrip cut from the file.

     For each flagged moment, fix it (re-render only the affected segments: delete their
     `.ok`) or add it to `INTENDED`.
   - Give the reviewer the final 1 fps sheet too.
   - Repeat until qa.py exits 0.

   Commands, memory and timings are in `references/render-deliver.md`.

## 5 · Deliver

- Commit and tag the version (`git tag vN`). Deliverables live in `<project>/vN/`.
  finalize.sh refuses to overwrite: earlier versions stay side by side.
- Report:
  - paths, sizes and duration;
  - the concept in one line;
  - what the loop caught and fixed (summarised from LOOP.md);
  - what a human should still judge. You can't watch motion in real time or hear the
    music. Give them `node render.mjs serve`: a live preview with sound, a timecode and
    seeking. Name the timestamps worth a look and a listen.
- Update the profile: add this video to *Past videos* (concept, structure, devices, key
  and tempo) and add any durable preference the user expressed.

## 6 · Feedback rounds

Feedback arrives as screenshots plus timestamps. For each point:

1. Reproduce it (`preview` or `sheet` at that time).
2. Fix the cause.
3. Run the loop again, scoped to the affected scenes, then the render and QA.

A new version goes to a new `vN/` folder unless the user says otherwise. Add durable
preferences to the profile, not one-off fixes.

## Making it great, and different every time

- **Start from the product, never from a previous film.** The DNA list and the
  references are the raw material. `references/devices.md` has a wider vocabulary of
  openings, transitions, metaphors and UI presentations than any one film should use.
  Pick few, and pick fresh.
- **Hook in the first 2–3 s.** A tension, a question or a striking image. A logo alone
  is not a hook.
- **Build the film around the magic moment.** Give it the drop in the music, the
  longest shot and the clearest framing.
- **Outcomes over features.** One idea per scene.
- **Vary camera distance and device.** Use transformations more than cuts. Show the real
  UI wide at least once, for credibility.
- **Keep text readable.** Allow about 0.4 s per word plus 0.5 s, one thing to read at a
  time, and copy in the product's own words. No slogans.
- **Rhythm.** Shots of 3–5 s, one faster burst, and a breath in the music before each
  new section.

## Defaults (the profile overrides them)

- **Faithful to the real product:** real logo (traced, never redrawn), real theme, real
  strings, real flows. Never show features the product lacks.
- **The brand name, not a feature's name.**
- **No voiceover** unless asked.
- **Minimal copy** in the product's language.
- **Official store badges,** unmodified, at equal visual height.
- **Every delivered version kept.**
- **Honest reporting** of what was and wasn't verified.

## Files

- `template/` is the working project `new_project.sh` copies:
  - `timeline.js`, `lib.js` (maths, springs, camera, cursor, text streaming, comet links,
    touch taps), `logo.js`, `main.js` (with the live player), `index.html`;
  - the `demo-*.js` scenes;
  - `synth.ts` (the engine) and `audio.ts` (the arrangement and SFX);
  - `render.mjs` (serve, preview, sheet, review, render), `render-segs.sh`,
    `watchdog.sh`, `finalize.sh`;
  - `trace_logo.py` and `gen-icons.mjs`.
- `scripts/`:
  - `new_project.sh`, `analyze_refs.py`, `asset_sheet.sh`, `store_badges.sh`;
  - `pdf_passage.py`: a real document page plus the boxes of a quoted passage;
  - `qa.py`: automated checks on the rendered file.
- `references/`:
  - `research.md`: references, product fidelity, fact-checking, case studies;
  - `devices.md`: the creative vocabulary;
  - `engine.md`: rules, API, cookbook, pitfalls;
  - `quality-loop.md`: rubric, reviewer prompt, exit criteria;
  - `audio.md`;
  - `render-deliver.md`.
