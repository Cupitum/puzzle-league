#!/usr/bin/env bash
# ONE grouped local-only development gate. No remote connections or production writes.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"
bash scripts/polishing/integrated_security_gate.sh
node --test tests/polishing-live-local-contract.test.mjs tests/polishing-pending-sources-routing.test.mjs tests/polishing-live-diagnostics-contract.test.mjs
bash scripts/polishing/local_live_auth_edge_gate.sh
printf '\nGROUPED LOCAL APPLICATION + REAL AUTH/JWT/POSTGREST GATE PASS.\n'
printf 'Deployed Edge runtime and hosted acceptance are explicitly NOT proven.\n'
