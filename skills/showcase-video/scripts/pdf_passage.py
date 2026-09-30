#!/usr/bin/env python3
"""Show a real document with the exact passage highlighted (citations, "view source",
search results): renders one PDF page and finds where a quoted passage sits on it.

    pdf_passage.py <file.pdf> <page> "quoted passage" [--out assets/doc-p19] [--dpi 150]

→ <out>.png (the page) and <out>.json:
  {"page", "w", "h", "score", "boxes": [[x, y, w, h], …]}  — one box per line of the passage,
  in the PNG's pixels, ready to position highlight marks over the image in a scene.
Matching ignores case, accents, punctuation and line-break hyphenation; `score` < 1 means
a fuzzy match (check the preview). Needs poppler (pdftoppm, pdftotext).
"""
import json, re, subprocess, sys, unicodedata
from html import unescape

def norm(w):
    w = unicodedata.normalize('NFKD', w).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^\w]', '', w)

args = sys.argv[1:]
if len(args) < 3:
    print(__doc__); sys.exit(2)
pdf, page, quote = args[0], int(args[1]), args[2]
out = args[args.index('--out') + 1] if '--out' in args else f'assets/doc-p{page}'
dpi = int(args[args.index('--dpi') + 1]) if '--dpi' in args else 150

subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-r', str(dpi), '-png', '-singlefile', pdf, out], check=True)
xml = subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-bbox', pdf, '-'], capture_output=True, text=True, check=True).stdout
pw, ph = map(float, re.search(r'<page width="([\d.]+)" height="([\d.]+)"', xml).groups())
words = [(unescape(t), float(a), float(b), float(c), float(d)) for a, b, c, d, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', xml)]

# join words hyphenated across a line break ("inmo-" + "vilización") into one token with both boxes
toks = []
for w in words:
    if toks and toks[-1][0].endswith('-') and w[2] > toks[-1][1][-1][2]:
        toks[-1] = (toks[-1][0][:-1] + w[0], toks[-1][1] + [w[1:]])
    else:
        toks.append((w[0], [w[1:]]))
W = [norm(t) for t, _ in toks]
Q = [q for q in (norm(x) for x in quote.split()) if q]
best, at = -1, 0
for i in range(0, max(1, len(W) - len(Q) + 1)):
    s = sum(1 for j, q in enumerate(Q) if i + j < len(W) and W[i + j] == q)
    if s > best:
        best, at = s, i
score = best / max(1, len(Q))
k = dpi / 72
lines = []
for _, boxes in toks[at:at + len(Q)]:
    for x0, y0, x1, y1 in boxes:
        if lines and abs(lines[-1][1] - y0) < 3:
            l = lines[-1]; l[0] = min(l[0], x0); l[2] = max(l[2], x1); l[3] = max(l[3], y1)
        else:
            lines.append([x0, y0, x1, y1])
boxes = [[round(a * k, 1), round(b * k, 1), round((c - a) * k, 1), round((d - b) * k, 1)] for a, b, c, d in lines]
json.dump({'page': page, 'w': round(pw * k), 'h': round(ph * k), 'score': round(score, 2), 'boxes': boxes}, open(out + '.json', 'w'))
print(f'{out}.png + {out}.json: {len(boxes)} line box(es), match score {score:.2f}' + ('' if score == 1 else ' — fuzzy: check a preview'))
