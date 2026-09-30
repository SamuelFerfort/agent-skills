# Render and deliver

## Commands

```bash
node render.mjs serve                      # live preview with sound for humans: …/index.html?play=26
node render.mjs preview 18 18.5 19         # full-size stills → out/preview-<t>.png
node render.mjs sheet 1 5 9 13 … --cols 6  # labelled contact sheet (quarter size)
node render.mjs sheet --from 9.7 --to 10.3 --step 0.05   # filmstrip across a moment
node render.mjs review [--scene id]        # the loop's review pack → out/review/<tag>/
./render-segs.sh v3 2 2                    # full render, resumable → out/v3.mkv (frame count checked)
REPORT=1 bun audio.ts                      # soundtrack + stem table per scene
SRC=out/v3.mkv NAME=acme-showcase-v3 DEST=../v3 ./finalize.sh   # master + web + share
python3 <skill>/scripts/qa.py ../v3/acme-showcase-v3.mp4 .      # automated QA on the file
```

## Memory and time

- **Cost.** Each render worker is a Chromium page plus an ffmpeg process at 4K when
  supersampling (dsf 2): expect roughly 2–3 GB each.
  - The safe default is **2 workers at dsf 2**.
  - With less than ~8 GB free, use 1 worker, or dsf 1 for drafts.
  - On a 32 GB laptop, expect about 20–25 min per minute of video at dsf 2.
- **Watchdog.** `render-segs.sh` runs `watchdog.sh` on its own render PID. It stops
  that render (and only that one) when available memory drops below 1.2 GB (or Linux
  memory pressure passes 25), before the OS OOM-kills something bigger, like the
  terminal every agent session runs in. The segment is then retried with fewer workers.
- **Never kill renders by name** (`pkill -f ffmpeg`, `pkill chrome`). Other sessions
  or projects may be rendering their own videos.
- **Running it.** Run long renders in the background and wait for the exit
  notification instead of polling.
  - If the user wants to shut the computer down, tell them it resumes: rerunning
    `render-segs.sh` skips every segment with an `.ok` marker.
  - After a change, delete the `.ok` markers of the segments it touches. A timing shift
    invalidates every later segment.
- **Drafts.** Render one scene at low cost:
  `node render.mjs render --from 26 --to 44 --dsf 1 --name draft-s4`.

## Deliverables

finalize.sh masters the soundtrack to −14 LUFS integrated with ≤ −1 dBTP (linear gain
only), re-tags the colour as BT.709, and writes three files:

| File | For | Typical size |
|---|---|---|
| `<name>.mp4` | master (crf 17, 1080p60) | 5–7 MB per second |
| `<name>-web.mp4` | websites, decks (crf 22) | about a quarter of the master |
| `<name>-share.mp4` | chat apps (720p, 2-pass to `SHARE_MB`, default 15 MB) | ≤ 15 MB |

For the full-quality master, a link (Drive, WeTransfer) travels better than an
attachment.

## Versions

- **Deliverables** go to `<project>/vN/`. finalize.sh refuses to overwrite existing
  files. Never delete or replace an earlier version: people compare cuts side by side.
- **Code.** Commit and tag each delivered version in `src/` (`git tag vN`). To rebuild
  an old cut: `git worktree add ../vN-src vN`.
- **Profile.** Add the video to the profile's *Past videos*: concept, structure,
  devices, key and tempo, and anything the user said they liked or rejected.
