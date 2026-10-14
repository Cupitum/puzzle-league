#!/usr/bin/env bash
# Runs only the failed HTTP acceptance gate; no migrations, resets or backup changes.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
python3 scripts/phase4/preflight.py
# The original script below performs its own strict local DB guard and safe cleanup.
PRIVATE_DIR="${HOME}/.local/share/puzzle-league-phase4-diagnostics"
mkdir -p "$PRIVATE_DIR"
chmod 700 "$PRIVATE_DIR"
LOG="$(mktemp "$PRIVATE_DIR/edge.XXXXXXXX.log")"
chmod 600 "$LOG"
EDGE_PID=''
cleanup() {
  if [[ -n "$EDGE_PID" ]]; then
    kill "$EDGE_PID" 2>/dev/null || true
    wait "$EDGE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
npx --no-install supabase functions serve competition --no-verify-jwt > "$LOG" 2>&1 &
EDGE_PID="$!"
READY=0
LAST_CODE='000'
for i in $(seq 1 15); do
  if ! kill -0 "$EDGE_PID" 2>/dev/null; then
    echo 'PHASE 4 EDGE START: FAIL; process stopped unexpectedly (private log retained)' >&2
    echo "Private log: $LOG" >&2
    exit 1
  fi
  LAST_CODE="$(curl -sS -o /dev/null --max-time 2 -w '%{http_code}' \
    'http://127.0.0.1:54321/functions/v1/competition' 2>/dev/null || true)"
  if [[ "$LAST_CODE" == '405' ]]; then READY=1; break; fi
  sleep 2
done
if [[ "$READY" != '1' ]]; then
  echo "PHASE 4 EDGE READINESS: FAIL; GET endpoint returned HTTP ${LAST_CODE:-000} (expected 405)" >&2
  echo "Private log: $LOG" >&2
  exit 1
fi
echo 'PHASE 4 EDGE READINESS: PASS (HTTP 405 on unsupported GET)'
python3 scripts/phase4/diagnose_http.py
