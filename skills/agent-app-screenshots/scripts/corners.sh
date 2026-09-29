#!/usr/bin/env bash
# For crops that touch the edge of a rounded container (modal, dialog): removes 1 px (at 1x) from those
# edges, which carry whatever is behind, and makes the rounded corners transparent. Outputs WebP.
# usage: corners.sh <in.png> <out.webp> <edges: l t r b> <corners: tl tr bl br> <radius in image px>
#   e.g. a sidebar flush with the left edge of a modal with an 8 px radius, captured at 2x:
#   corners.sh sidebar.png sidebar.webp ltb "tl bl" 16
# env: SCALE (default 2)
set -euo pipefail
in=$1; out=$2; edges=$3; corners=$4; r=$5; s=${SCALE:-2}
args=()
[[ $edges == *l* ]] && args+=( -gravity West -chop "${s}x0" )
[[ $edges == *t* ]] && args+=( -gravity North -chop "0x${s}" )
[[ $edges == *r* ]] && args+=( -gravity East -chop "${s}x0" )
[[ $edges == *b* ]] && args+=( -gravity South -chop "0x${s}" )
tmp=$(mktemp --suffix .png)
magick "$in" "${args[@]}" +gravity +repage "$tmp"
w=$(magick identify -format %w "$tmp"); h=$(magick identify -format %h "$tmp")
keep=()
[[ $corners != *tl* ]] && keep+=( -draw "rectangle 0,0 $r,$r" )
[[ $corners != *tr* ]] && keep+=( -draw "rectangle $((w-r-1)),0 $w,$r" )
[[ $corners != *bl* ]] && keep+=( -draw "rectangle 0,$((h-r-1)) $r,$h" )
[[ $corners != *br* ]] && keep+=( -draw "rectangle $((w-r-1)),$((h-r-1)) $w,$h" )
magick "$tmp" -alpha set \( -size "${w}x${h}" xc:black -fill white -draw "roundrectangle 0,0 $((w-1)),$((h-1)) $r,$r" "${keep[@]}" \) \
  -alpha off -compose CopyOpacity -composite -quality 82 -define webp:method=6 "$out"
rm -f "$tmp"
echo "$out $(magick identify -format '%wx%h' "$out")"
