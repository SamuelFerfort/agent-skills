# agent-skills

Skills for AI coding agents (Claude Code, Cursor, Codex and others), in the
[Agent Skills](https://skills.sh) format.

```bash
npx skills add SamuelFerfort/agent-skills
```

## Skills

### [agent-app-screenshots](skills/agent-app-screenshots/SKILL.md)

Explore a web app with [agent-browser](https://github.com/vercel-labs/agent-browser), capture curated
and redacted screenshots of it, and plug them into an AI agent. The agent then explains where things
are in the app and shows the right screenshot inline, right after the sentence that explains it: with
a marker in chat, and with a tool in voice. It comes from a production chat widget.

- `SKILL.md`: the method, from the UI inventory to verifying against the real model, including the
  mistakes made along the way.
- `reference.md`: frontend (marker to component) and backend (catalog, skill, tool) code, plus tests.
- `scripts/`: capture and curation helpers for agent-browser and ImageMagick 7. They handle shadow
  DOM, crops at 2x, redaction through a single mask, transparent rounded corners and trimming.

Requirements: `agent-browser`, ImageMagick 7 (`magick`), Python 3.

### [showcase-video](skills/showcase-video/SKILL.md)

Make polished motion-design product videos (launch films, promos, app showcases) entirely in
code, with an original synthesized soundtrack. The agent researches reference launches and the
real product, proposes three distinct directions built from the product's own visual DNA, and
asks for one approval of the plan (storyboard + asset sheet). Then it builds, reviews and fixes
the video on its own until it passes: scene review packs judged by a fresh reviewer subagent,
and automated QA of the rendered file (frame count, colour, loudness, unplanned jumps). A
per-user profile remembers preferences and past films, so the next one is different.

- `SKILL.md`: the workflow, from the brief to delivery, including the approval gate and the loop.
- `references/`: reference research, a vocabulary of devices, the engine, the quality loop
  (rubric and reviewer prompt), audio, rendering and delivery.
- `scripts/`: project scaffold, reference-video analysis (cuts, shots, loudness, contact
  sheets), asset sheet, official store badges, PDF passage finder, QA of the final file.
- `template/`: a working 12 s project. Frame-exact HTML scenes, a synth engine for music and
  SFX, a resumable memory-guarded renderer, a live preview with sound, review and QA hooks.

Requirements: Node ≥ 20, bun, ffmpeg, ImageMagick 7, Playwright with `chromium-headless-shell`,
uv, yt-dlp, poppler. Linux or macOS. Bundled third-party files keep their licenses: the Inter
font (SIL OFL 1.1) and Lucide icons (ISC).
