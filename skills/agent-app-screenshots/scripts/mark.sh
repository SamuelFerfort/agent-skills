#!/usr/bin/env bash
# Tags with data-cap="<name>" the element(s) returned by the JS expression (it can use $$, see q.sh).
# usage: mark.sh "$$('textarea')[0].closest('form')" composer
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
"$DIR/q.sh" "const els=[].concat(($1)||[]); els.forEach(e=>e&&e.setAttribute('data-cap','$2')); return els.filter(Boolean).length"
