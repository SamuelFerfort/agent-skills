#!/usr/bin/env bash
# Trims a screenshot to its content and adds a uniform white margin; outputs WebP. Meant for demo cards
# with lots of white space below.
# The 1 px white border before -trim is deliberate: on a rounded card the corner pixel is grey, -trim
# takes it as the background colour and removes nothing. `shave` first drops the card's own border.
# usage: trim.sh <in.png> <out.webp> [shave_px=12] [margin_px=36]
set -euo pipefail
in=$1; out=$2; shave=${3:-12}; margin=${4:-36}
magick "$in" -shave "${shave}x${shave}" +repage -bordercolor white -border 1 -fuzz 4% -trim +repage \
  -bordercolor white -border "$margin" -quality 82 -define webp:method=6 "$out"
echo "$out $(magick identify -format '%wx%h' "$out")"
