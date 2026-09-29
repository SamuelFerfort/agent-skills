#!/usr/bin/env bash
# Clicks (with el.click()) the first button, link or role element whose text or aria-label contains "$1".
# Note: this is not a user gesture. For anything that opens a popup, or a react-aria menu, use a real
# click: `agent-browser click @eN` (a ref from `snapshot -i`), or `mouse move X Y; mouse down; mouse up`.
# usage: click.sh "Settings"
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
t=$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")
"$DIR/q.sh" "const el=\$\$('button,a,[role=button],[role=menuitem],[role=option],[role=tab]').find(e=>(e.textContent||'').includes($t)||(e.getAttribute('aria-label')||'').includes($t)); if(!el) return 'NOT FOUND'; el.click(); return 'ok'"
