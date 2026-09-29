#!/usr/bin/env bash
# Wraps every match of regex $1 in the page text (and inside shadow roots) in <span data-cap="redact">.
# Visual only: lets you blur a number without blurring the sentence around it.
# Then: shot.sh <id> <selector> <padding> "[data-cap=redact]"
# usage: wrap.sh '\+34 900 000 000'
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
re=$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")
"$DIR/q.sh" "const rx=new RegExp($re,'g'); let n=0; const roots=(r)=>[r,...[...r.querySelectorAll('*')].filter(e=>e.shadowRoot).flatMap(e=>roots(e.shadowRoot))]; for(const r of roots(document)){ const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT); const nodes=[]; while(w.nextNode()) if(rx.test(w.currentNode.data)) nodes.push(w.currentNode), rx.lastIndex=0; for(const t of nodes){ const frag=document.createDocumentFragment(); let last=0; t.data.replace(rx,(m,...a)=>{const i=a[a.length-2]; frag.append(t.data.slice(last,i)); const s=document.createElement('span'); s.dataset.cap='redact'; s.textContent=m; frag.append(s); last=i+m.length; n++; return m}); frag.append(t.data.slice(last)); t.replaceWith(frag);} } return n"
