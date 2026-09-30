#!/usr/bin/env python3
"""Study reference launch videos the way an editor would: cuts, shot length, light/dark,
music loudness over time, plus contact sheets you can actually look at.

  analyze_refs.py search "v0 launch video" "Linear launch" …
      → YouTube candidates: title | channel | duration | views | url
  analyze_refs.py analyze <out-dir> name=<youtube-url | youtube-id | local file> [name=… …]
      → <out-dir>/<name>.mp4 (720p), <name>-time.png (a frame every ~1.5–3 s, timestamped),
        <name>-shots.png (one frame per shot), <name>.txt (auto-subtitle transcript, if any),
        refs.json (all numbers) and a markdown table on stdout.

Needs yt-dlp, ffmpeg/ffprobe, ImageMagick 7 (magick). Downloads are for private study only.
"""
import json, os, re, statistics, subprocess, sys

def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)

def search(queries):
    for q in queries:
        print(f'## {q}')
        r = run(['yt-dlp', '--flat-playlist', '--print', '%(title)s | %(channel)s | %(duration_string)s | %(view_count)s | %(url)s', f'ytsearch8:{q}'], timeout=120)
        print(r.stdout.strip() or r.stderr.strip()[-300:])

def sheet(frames, out, cols=6):
    run(['magick', 'montage', *frames, '-tile', f'{cols}x', '-geometry', '+2+2', '-background', '#222', out])

def grab(f, t, out, label):
    run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{t:.2f}', '-i', f, '-frames:v', '1', '-vf', 'scale=320:-1', out])
    run(['magick', out, '-gravity', 'southwest', '-fill', 'white', '-undercolor', '#000a', '-pointsize', '15', '-annotate', '+3+3', label, out])

def analyze(out_dir, items):
    os.makedirs(out_dir, exist_ok=True)
    results = {}
    for item in items:
        name, ref = item.split('=', 1)
        local = os.path.isfile(os.path.expanduser(ref))
        url = os.path.abspath(os.path.expanduser(ref)) if local else ref if ref.startswith('http') else f'https://www.youtube.com/watch?v={ref}'
        f = url if local else os.path.join(out_dir, f'{name}.mp4')
        if not os.path.exists(f):
            r = run(['yt-dlp', '-q', '--no-warnings', '-f', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]', '--merge-output-format', 'mp4', '-o', f, url], timeout=600)
            if not os.path.exists(f):
                print(f'{name}: download failed: {r.stderr.strip()[-300:]}', file=sys.stderr)
                continue
        dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout)
        # hard cuts (scene score > 0.27); continuous one-camera films report none
        log = run(['ffmpeg', '-hide_banner', '-i', f, '-vf', "select='gt(scene,0.27)',showinfo", '-an', '-f', 'null', '-']).stderr
        cuts = [float(m) for m in re.findall(r'pts_time:([\d.]+)', log)]
        cuts = [c for i, c in enumerate(cuts) if i == 0 or c - cuts[i - 1] > 0.2]
        bounds = [0.0] + cuts + [dur]
        shots = [b - a for a, b in zip(bounds, bounds[1:]) if b - a > 0.05]
        # brightness twice a second: share of dark (<70) and light (>150) frames
        log = run(['ffmpeg', '-hide_banner', '-i', f, '-vf', 'fps=2,scale=160:-1,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-an', '-f', 'null', '-']).stderr
        ys = [float(v) for v in re.findall(r'YAVG=([\d.]+)', log)]
        # music: integrated loudness + short-term curve every 2 s (where it breathes, where it drops)
        log = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-vn', '-af', 'ebur128', '-f', 'null', '-']).stderr
        st = [(float(t), float(s)) for t, s in re.findall(r't:\s*([\d.]+)\s+TARGET.*?S:\s*(-?[\d.]+)', log)]
        I = re.findall(r'I:\s+(-?[\d.]+) LUFS', log)
        curve = [round(s) for t, s in st if t >= 1 and abs(t % 2) < 0.06]
        results[name] = dict(url=url, dur=round(dur, 1), shots=len(shots), mean_shot=round(statistics.mean(shots), 2), median_shot=round(statistics.median(shots), 2),
                             shortest=round(min(shots), 2), longest=round(max(shots), 2),
                             cuts_per_10s=[sum(1 for c in cuts if k <= c < k + 10) for k in range(0, int(dur), 10)],
                             dark=round(sum(y < 70 for y in ys) / max(1, len(ys)), 2), light=round(sum(y > 150 for y in ys) / max(1, len(ys)), 2),
                             lufs=float(I[-1]) if I else None, loudness_every_2s=curve)
        tmp = os.path.join(out_dir, f'.{name}-frames'); os.makedirs(tmp, exist_ok=True)
        step, t, frames = max(1.5, round(dur / 30, 1)), 0.3, []
        while t < dur - 0.2:
            p = os.path.join(tmp, f't{len(frames):03d}.png'); grab(f, t, p, f'{t:.1f}s'); frames.append(p); t += step
        sheet(frames, os.path.join(out_dir, f'{name}-time.png'))
        mids = [(a + b) / 2 for a, b in zip(bounds, bounds[1:]) if b - a > 0.05][:60]
        if len(mids) > 1:
            sf = []
            for i, m in enumerate(mids):
                p = os.path.join(tmp, f's{i:03d}.png'); grab(f, m, p, f'{m:.1f}s'); sf.append(p)
            sheet(sf, os.path.join(out_dir, f'{name}-shots.png'))
        run(['rm', '-rf', tmp])
        # transcript (tells you if it is an interview / voiceover / pure motion)
        base = os.path.join(out_dir, f'.{name}-sub')
        if not local: run(['yt-dlp', '-q', '--no-warnings', '--skip-download', '--write-auto-subs', '--sub-langs', 'en.*,es.*', '--sub-format', 'vtt', '-o', base, url], timeout=120)
        vtt = [x for x in os.listdir(out_dir) if x.startswith(f'.{name}-sub') and x.endswith('.vtt')]
        if vtt:
            lines, seen = [], set()
            for l in open(os.path.join(out_dir, vtt[0]), encoding='utf-8'):
                l = re.sub(r'<[^>]*>', '', l).strip()
                if not l or l.startswith(('WEBVTT', 'Kind', 'Language')) or '-->' in l or l in seen: continue
                seen.add(l); lines.append(l)
            open(os.path.join(out_dir, f'{name}.txt'), 'w').write(' '.join(lines))
            results[name]['words'] = len(' '.join(lines).split())
            for x in vtt: os.remove(os.path.join(out_dir, x))
        print(f'{name}: {results[name]["shots"]} shots in {results[name]["dur"]} s', file=sys.stderr)
    json.dump(results, open(os.path.join(out_dir, 'refs.json'), 'w'), indent=1)
    print('| Video | Duration | Shots | Median shot | Dark / light | LUFS | Spoken words |')
    print('|---|---|---|---|---|---|---|')
    for n, r in results.items():
        print(f"| [{n}]({r['url']}) | {r['dur']} s | {r['shots']} | {r['median_shot']} s | {int(r['dark']*100)}% / {int(r['light']*100)}% | {r['lufs']} | {r.get('words', 0)} |")

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('search', 'analyze'):
        print(__doc__); sys.exit(1)
    search(sys.argv[2:]) if sys.argv[1] == 'search' else analyze(sys.argv[2], sys.argv[3:])
