#!/usr/bin/env bash
# Runs JS in the page with a `$$(selector)` that also searches nested shadow roots.
# usage: q.sh "return $$('aside').length"
# env: SESSION (agent-browser session name)
set -euo pipefail
agent-browser --session "${SESSION:?SESSION is not set}" eval "(() => { const all=(root)=>[root,...[...root.querySelectorAll('*')].filter(e=>e.shadowRoot).flatMap(e=>all(e.shadowRoot))]; const \$\$=(s)=>all(document).flatMap(r=>[...r.querySelectorAll(s)]); return (() => { $1 })() })()" | tail -1
