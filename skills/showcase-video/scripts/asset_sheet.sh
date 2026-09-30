#!/usr/bin/env bash
# Contact sheet of every asset a video will use, each labelled with what it is and where it
# comes from — shown to the user for approval before building.
# Usage: asset_sheet.sh out.png "file|label" "file|label" …
#   e.g. asset_sheet.sh refs/assets.png "src/assets/logo-source.png|Logo · repo public/logo.svg" \
#        "src/assets/appstore-es.svg|App Store badge ES · official"
set -euo pipefail
OUT=${1:?usage: asset_sheet.sh out.png "file|label" …}; shift
args=()
for item in "$@"; do
  f=${item%%|*}; l=${item#*|}; [ "$l" = "$item" ] && l=$(basename "$f")
  [ -e "$f" ] || { echo "missing: $f"; exit 1; }
  args+=(-label "$l" "$f")
done
FONT=$(fc-match -f '%{file}' sans-serif 2>/dev/null || true)
magick montage -background '#16161c' -fill '#e8e8ee' ${FONT:+-font "$FONT"} -pointsize 16 "${args[@]}" -geometry 420x280+16+16 -tile 4x "$OUT"
echo "$OUT"
