#!/usr/bin/env bash
# Scaffold a showcase video project from the skill's template.
# Usage: new_project.sh <project-dir>     e.g. new_project.sh ~/Videos/acme-showcase
# Creates <project-dir>/src (the code) — deliverables go to <project-dir>/v1, v2… later.
# For a new VERSION of an existing video, copy that version's src instead (cp -r v1/src v2/src).
set -euo pipefail
DIR=${1:?usage: new_project.sh <project-dir>}
SRC="$DIR/src"
[ -e "$SRC" ] && { echo "$SRC already exists — not overwriting (earlier versions stay intact)"; exit 1; }
mkdir -p "$DIR"
cp -r "$(dirname "$0")/../template" "$SRC"
mkdir -p "$SRC/out" "$DIR/refs"
chmod +x "$SRC"/*.sh
# The code is versioned with git: commit + tag each delivered version (git tag v2) so any
# earlier cut can be rebuilt exactly, while its mp4s stay untouched in <project-dir>/vN/.
printf 'out/\n' > "$SRC/.gitignore"
git -C "$SRC" init -q && git -C "$SRC" add -A && git -C "$SRC" commit -qm "Template" && echo "git: initialised $SRC"
missing=()
for c in node bun ffmpeg ffprobe magick uv; do command -v $c >/dev/null || missing+=($c); done
[ ${#missing[@]} -gt 0 ] && echo "missing tools: ${missing[*]}"
echo "$SRC ready. Smoke test: cd $SRC && node render.mjs sheet 0.5 2 3.9 5.5 7 8.6 10.6 11"
