#!/usr/bin/env python3
"""Automated QA of a rendered video against its timeline — the machine half of the final
review, run on the actual file (the join, the encode and the audio mux only exist there).

    qa.py <video.mp4|mkv> <src-dir>

Blockers (exit 1 until resolved):
  ✗ frame count ≠ DURATION × FPS (a bad segment join doubles or truncates), wrong resolution,
    colour not tagged bt709 (mp4), no audio (mp4), loudness outside −14 ±1 LUFS, true peak > −1 dBTP
  ✗ moments to review: discontinuities (a frame that changes far more than its neighbours:
    jumps, pops, stray cuts) and near-black stretches that are not planned. Planned = a SCENES
    boundary (±0.12 s), inside a scene marked {montage: true}, or listed in timeline.js
    `INTENDED` (e.g. [T.flash, T.modal]: reference cues, so it survives timing changes).
    Each gets a filmstrip from the file in <src>/out/qa/<name>/: look at it, then fix the bug
    or add the time to INTENDED. A polished 84 s video had ~35 on its first pass — mostly
    instant UI changes (a modal opening, a flash), and that is the point: every instant
    change should be one you meant.
Notes: frozen stretches ≥ 2.5 s, silences ≥ 0.6 s.
Also writes a 1 fps contact sheet of the whole file.
"""
import json, math, os, re, shutil, subprocess, sys

def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)

if len(sys.argv) < 3:
    print(__doc__); sys.exit(2)
video, src = sys.argv[1], sys.argv[2]
name = os.path.splitext(os.path.basename(video))[0]
out = os.path.join(src, 'out', 'qa', name)
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)

TL_JS = "import('./timeline.js').then(m => console.log(JSON.stringify({D: m.DURATION, F: m.FPS, W: m.W, H: m.H, S: m.SCENES || null, I: m.INTENDED || [], fade: (m.T && m.T.fadeOut) || null})))"
tl = json.loads(run(['node', '-e', TL_JS], cwd=src).stdout)
blockers, notes, review = [], [], []
def ok(msg): print(f'✓ {msg}')
def bad(msg): blockers.append(msg); print(f'✗ {msg}')
def note(msg): notes.append(msg); print(f'• {msg}')

# ── stream facts ───────────────────────────────────────────────────────────────
v = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,color_space,nb_read_packets', '-of', 'json', video]).stdout)['streams'][0]
dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).stdout)
has_audio = bool(run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', video]).stdout.strip())
want = round(tl['D'] * tl['F'])
n = int(v['nb_read_packets'])
(ok if n == want else bad)(f'frames {n} (timeline {want}) · {dur:.2f} s')
(ok if (v['width'], v['height']) == (tl['W'], tl['H']) else bad)(f"resolution {v['width']}×{v['height']}")
if video.endswith('.mp4'):
    (ok if v.get('color_space') == 'bt709' else bad)(f"colour {v.get('color_space', 'untagged')}")

# ── what counts as planned ─────────────────────────────────────────────────────
scenes = tl['S'] or []
bounds = {s[1] for s in scenes} | {s[2] for s in scenes}
montage = [(s[1], s[2]) for s in scenes if len(s) > 3 and isinstance(s[3], dict) and s[3].get('montage')]
def planned(t):
    return any(abs(t - b) <= 0.12 for b in bounds | set(tl['I'])) or any(a <= t <= b for a, b in montage)
if not scenes:
    note('timeline.js exports no SCENES: every discontinuity is listed for review')

# ── discontinuities: a frame that changes far more than its neighbours ────────
# Continuous motion changes a little every frame; a jump spikes against the local median
# (a 260 px jump of a dark UI scored 0.02 — 40× its neighbours, far below the usual 0.3 cut threshold).
log = run(['ffmpeg', '-hide_banner', '-i', video, '-an', '-vf', "scale=480:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score", '-f', 'null', '-']).stderr
ts = [float(x) for x in re.findall(r'pts_time:([\d.]+)', log)]
sc = [float(x) for x in re.findall(r'lavfi.scene_score=([\d.]+)', log)]
events = []
for i, (t, x) in enumerate(zip(ts, sc)):
    around = sorted(sc[max(0, i - 30):i] + sc[i + 1:i + 31]) or [0]
    if x > 0.3 or (x > 0.006 and x > 10 * max(around[len(around) // 2], 0.0004)):
        if events and t - events[-1][1] <= 0.1:
            events[-1][1] = t
        else:
            events.append([t, t])
review += [('discontinuity', a, b) for a, b in events if not planned(a)]

# ── near-black stretches outside the opening fade-in and the closing fade-out ─
log = run(['ffmpeg', '-hide_banner', '-i', video, '-an', '-vf', 'scale=480:-2,blackdetect=d=0.05:pix_th=0.06', '-f', 'null', '-']).stderr
fade_out = (tl['fade'] or [tl['D'] - 1.5])[0]
for a, b in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', log):
    a, b = float(a), float(b)
    if b > 0.6 and a < fade_out - 0.05 and not planned(a):
        review.append(('near-black', a, b))

# ── a filmstrip from the file for every moment to review ───────────────────────
for kind, a, b in review:
    t0 = max(0, a - 0.25)
    strip = os.path.join(out, f'{a:07.2f}-{kind}.png')
    frames = max(10, min(20, round((b - a + 0.5) * 20)))
    # (no -copyts: with it, -t counts from the absolute timestamp and writes nothing; drawtext adds t0 instead)
    vf = f"fps=20,scale=384:-2,drawtext=text='%{{pts\\:flt\\:{t0:.3f}}}':x=4:y=h-20:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6,tile={frames}x1"
    r = run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{t0:.3f}', '-i', video, '-t', f'{frames / 20:.2f}', '-vf', vf, '-frames:v', '1', '-update', '1', strip])
    if r.returncode or not os.path.exists(strip):
        run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{t0:.3f}', '-i', video, '-t', f'{frames / 20:.2f}', '-vf', f'fps=20,scale=384:-2,tile={frames}x1', '-frames:v', '1', '-update', '1', strip])
if review:
    bad(f'{len(review)} unplanned moment(s) to review — filmstrips (20 fps, from 0.25 s before) in {out}:')
    for kind, a, b in review:
        print(f'    {a:6.2f}–{b:6.2f} s  {kind}')
    print('    fix each bug; add each intended one to INTENDED in timeline.js (by cue: T.flash, T.modal…)')
else:
    ok(f'no unplanned discontinuities or near-black stretches ({len(events)} discontinuities, all planned)')

# ── frozen stretches ───────────────────────────────────────────────────────────
log = run(['ffmpeg', '-hide_banner', '-i', video, '-an', '-vf', 'scale=480:-2,freezedetect=n=0.0015:d=2.5', '-f', 'null', '-']).stderr
starts = [float(x) for x in re.findall(r'freeze_start: ([\d.]+)', log)]
ends = [float(x) for x in re.findall(r'freeze_end: ([\d.]+)', log)] + [dur]
for a, b in zip(starts, ends):
    note(f'frozen {a:.2f}–{b:.2f} s ({b - a:.1f} s): an intended hold, or a scene that stalls?')

# ── audio ──────────────────────────────────────────────────────────────────────
if has_audio:
    log = run(['ffmpeg', '-hide_banner', '-nostats', '-i', video, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', log)[-1])
    TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', log)[-1])
    (ok if abs(I + 14) <= 1 else bad)(f'loudness {I} LUFS (target −14)')
    (ok if TP <= -0.9 else bad)(f'true peak {TP} dBTP (max −1)')
    log = run(['ffmpeg', '-hide_banner', '-i', video, '-vn', '-af', 'silencedetect=noise=-50dB:d=0.6', '-f', 'null', '-']).stderr
    for a, b in re.findall(r'silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)', log):
        a, b = float(a), float(b)
        if a > 0.3 and b < dur - 0.3:
            note(f'silence {a:.2f}–{b:.2f} s: an intended breath?')
elif video.endswith('.mp4'):
    bad('no audio stream')

# ── contact sheet of the whole file ────────────────────────────────────────────
sheet = os.path.join(out, 'sheet-1fps.png')
cols, rows = 8, math.ceil(dur / 8)
vf = f"fps=1,scale=320:-2,drawtext=text='%{{eif\\:t\\:d}} s':x=6:y=h-24:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6,tile={cols}x{rows}"
if run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-vf', vf, '-frames:v', '1', '-update', '1', sheet]).returncode:
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-vf', f'fps=1,scale=320:-2,tile={cols}x{rows}', '-frames:v', '1', '-update', '1', sheet])
print(f'\nwhole-file sheet (1 tile per second): {sheet}')
print(f'{len(blockers)} blocker(s), {len(notes)} note(s)')
sys.exit(1 if blockers else 0)
