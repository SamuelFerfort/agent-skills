# /// script
# dependencies = ["pillow", "numpy", "scipy", "potracer"]
# ///
"""Trace the product's real logo into assets/logo.json for logo.js (draw-on animation).

Input: a single-colour mark — ideally a PNG with transparency (white line-art, a flat
glyph…). Without alpha, the pixels that differ from the corner colour are the logo.
Output: {w, h, bbox, pieces: [{d, loops, area, cx, cy, x0, y0, x1, y1}]}, pieces sorted
by area (largest first); each loop is one closed contour logo.js strokes on.

    uv run trace_logo.py assets/logo-source.png [assets/logo.json]

Multi-colour logos: trace each colour layer separately (mask by colour distance) and
compose them in the scene; check the result in a preview before building on it.
"""
import json, sys
import numpy as np, potrace
from PIL import Image
from scipy import ndimage

src = sys.argv[1]
dst = sys.argv[2] if len(sys.argv) > 2 else 'assets/logo.json'
a = np.asarray(Image.open(src).convert('RGBA')).astype(float)
if a[..., 3].min() < 250:
    mask = a[..., 3] > 110
else:
    bg = a[0, 0, :3]
    mask = np.linalg.norm(a[..., :3] - bg, axis=-1) > 60
H, W = mask.shape
lab, n = ndimage.label(mask)

def curve_d(c):
    s = c.start_point
    out = [f'M{s.x:.1f},{s.y:.1f}']
    for seg in c.segments:
        if seg.is_corner:
            out.append(f'L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}')
        else:
            out.append(f'C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}')
    return ''.join(out) + 'Z'

pieces = []
for k in range(1, n + 1):
    m = lab == k
    area = int(m.sum())
    if area < 30:
        continue
    ys, xs = np.nonzero(m)
    # potracer traces the False pixels: pass the inverted mask (the classic polarity trap).
    plist = potrace.Bitmap(~m).trace(turdsize=2, alphamax=1.0, opticurve=True, opttolerance=0.2)
    loops = [curve_d(c) for c in plist]
    pieces.append({'d': ''.join(loops), 'loops': loops, 'area': area, 'cx': round(float(xs.mean()), 1), 'cy': round(float(ys.mean()), 1),
                   'x0': int(xs.min()), 'y0': int(ys.min()), 'x1': int(xs.max()), 'y1': int(ys.max())})
pieces.sort(key=lambda p: -p['area'])
ys, xs = np.nonzero(mask)
json.dump({'w': W, 'h': H, 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], 'pieces': pieces}, open(dst, 'w'))
print(f'{dst}: {len(pieces)} pieces, {sum(len(p["loops"]) for p in pieces)} loops, {W}x{H}')
