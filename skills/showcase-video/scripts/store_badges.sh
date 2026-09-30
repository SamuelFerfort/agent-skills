#!/usr/bin/env bash
# Official "Download on the App Store" / "Get it on Google Play" badges for one language.
# Usage: store_badges.sh <google-lang> <apple-locale> [out-dir=assets]
#   e.g. store_badges.sh es es-es · store_badges.sh en en-us · store_badges.sh fr fr-fr
# Google's PNG ships with transparent padding: it is trimmed so both badges can be placed
# at the same visual height. Use them unmodified (both stores' guidelines forbid edits).
set -euo pipefail
G=${1:?usage: store_badges.sh <google-lang> <apple-locale> [out-dir]}; A=${2:?apple locale, e.g. es-es}; OUT=${3:-assets}
mkdir -p "$OUT"
if curl -fsSL --max-time 30 "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/$A" -o "$OUT/appstore-$A.svg"; then
  echo "$OUT/appstore-$A.svg"
else
  echo "App Store badge: the generator failed (it is sometimes down). Retry later or download it from https://developer.apple.com/app-store/marketing/guidelines/ — do not edit another language's badge." >&2
fi
if curl -fsSL --max-time 30 "https://play.google.com/intl/en_us/badges/static/images/badges/${G}_badge_web_generic.png" -o "$OUT/googleplay-$G.png"; then
  magick "$OUT/googleplay-$G.png" -trim +repage "$OUT/googleplay-$G.png"
  echo "$OUT/googleplay-$G.png"
else
  echo "Google Play badge for '$G' not found: see https://play.google.com/intl/en_us/badges/" >&2
fi
