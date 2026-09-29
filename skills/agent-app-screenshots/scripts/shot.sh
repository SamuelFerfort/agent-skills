#!/usr/bin/env bash
# Crops, from a full screenshot at SCALE, the element matching <selector> (also inside shadow roots),
# with padding, and blurs the areas matching the selectors to redact.
# usage: shot.sh <id> <selector> [padding_px] [selector_to_redact ...]
# env: SESSION (agent-browser session), OUT (output folder), SCALE (default 2, as in `set viewport W H 2`)
# Needs ImageMagick 7 (`magick`).
set -euo pipefail
: "${SESSION:?SESSION is not set}" "${OUT:?OUT is not set}"
SCALE=${SCALE:-2}
A="agent-browser --session $SESSION"
id=$1; sel=$2; pad=${3:-12}; shift $(( $# < 3 ? $# : 3 ))

# Visible rectangles of what matches the selector, clipped to their scrolling container so that
# off-screen rows don't land on top of something else.
rects() {
  local q; q=$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")
  $A eval "(() => { const all=(root)=>[root,...[...root.querySelectorAll('*')].filter(e=>e.shadowRoot).flatMap(e=>all(e.shadowRoot))]; const visible=(el)=>{let b=el.getBoundingClientRect(); let x1=b.left,y1=b.top,x2=b.right,y2=b.bottom; let p=el.parentElement||el.getRootNode().host; while(p){const st=getComputedStyle(p); if(/(auto|scroll|hidden)/.test(st.overflowY+st.overflowX)){const c=p.getBoundingClientRect(); x1=Math.max(x1,c.left); y1=Math.max(y1,c.top); x2=Math.min(x2,c.right); y2=Math.min(y2,c.bottom);} p=p.parentElement||(p.getRootNode()!==document?p.getRootNode().host:null);} return x2>x1&&y2>y1?[x1,y1,x2-x1,y2-y1]:null}; const els=all(document).flatMap(r=>[...r.querySelectorAll($q)]).map(visible).filter(Boolean); return els.length ? els.map(b=>b.map(Math.round).join(',')).join(';') : 'NONE' })()" | tail -1 | tr -d '"'
}

r=$(rects "$sel")
[ "$r" = "NONE" ] && { echo "not found: $sel" >&2; exit 1; }
IFS=, read -r x y w h <<<"${r%%;*}"
mkdir -p "$OUT"
$A screenshot "$OUT/_full.png" >/dev/null

# One mask for every area: blurring area by area with -region takes minutes.
draws=()
for redact in "$@"; do
  br=$(rects "$redact")
  [ "$br" = "NONE" ] && continue
  IFS=';' read -ra areas <<<"$br"
  for z in "${areas[@]}"; do
    IFS=, read -r bx by bw bh <<<"$z"
    draws+=( -draw "rectangle $((bx*SCALE)),$((by*SCALE)) $(((bx+bw)*SCALE)),$(((by+bh)*SCALE))" )
  done
done

X=$(( (x-pad)*SCALE )); Y=$(( (y-pad)*SCALE )); W=$(( (w+2*pad)*SCALE )); H=$(( (h+2*pad)*SCALE ))
((X<0)) && X=0; ((Y<0)) && Y=0
if ((${#draws[@]})); then
  # Two assignments, not `read … < <(identify)`: identify prints no trailing newline and set -e kills it.
  FW=$(magick identify -format "%w" "$OUT/_full.png"); FH=$(magick identify -format "%h" "$OUT/_full.png")
  # The blurred layer takes the mask as its alpha (IM7's three-image mask works the other way round).
  magick "$OUT/_full.png" \( +clone -blur 0x16 \( -size "${FW}x${FH}" xc:black -fill white "${draws[@]}" \) \
    -alpha off -compose CopyOpacity -composite \) -compose Over -composite \
    -crop "${W}x${H}+${X}+${Y}" +repage "$OUT/$id.png"
else
  magick "$OUT/_full.png" -crop "${W}x${H}+${X}+${Y}" +repage "$OUT/$id.png"
fi
echo "$OUT/$id.png ${W}x${H}"
