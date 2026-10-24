# Puzzle League — Final Polishing verification hardening

**Source evidence:** owner-reported 23 Oct 2026 `complete_polishing_local_gate.sh` output. The final forward patch installed and the offline identity, Edge, TS, lint, Vitest, and build gates passed. The synthetic GoTrue/REST integration established four genuine LOCAL signed-token sessions and two disposable private leagues. It stopped before its third reported group (operator-only identity evidence). This report is an engineering diagnosis, not a deployed verification result.

## Verified source bug addressed

The Edge handler's `protectedPolish` action set included `pending_sources`, so the generic `p7_polishing` RPC intercepted it. But the SQL `p7_polishing` action allowlist has no `pending_sources`; the dedicated `p7_pending_sources` RPC later in the handler was unreachable. This patch removes `pending_sources` from the generic set, preserves bearer GoTrue identity validation, and routes it to the dedicated reviewer-authorization RPC. Tests verify no anonymous or direct generic-RPC access, actor derived from JWT, bad UUID rejection and deny-on-service-error. Historical requests remain read-only and never produce awards.

## Remaining first integration failure

The prior local test harness catches an exception but prints only its error type, not its associated assertion or database error. It cannot establish whether the first evidence registration, service-role lookup, public access denial, or unknown-reference check failed. **No SQL or role changes are justified yet.** This patch adds only enumerated stage labels, a five-character PostgreSQL SQLSTATE if returned for an operator fixture error, and the nonsecret HTTP status for one service lookup. It never logs raw SQL, response bodies, tokens, passwords, emails, account IDs or player details.

## Install and one consolidated test

Do not reapply earlier ZIP packages, reset, commit, push, run remote migrations or deploy. While on `feat/polishing-integrated-20261023` with all prior changes applied, verify this patch using `git apply --check`, apply once, and run `bash scripts/polishing/complete_polishing_local_gate.sh`. The suite uses disposable synthetic local users only and a loopback Docker network; no hosted state is touched. If the integration still fails, supply only `FAILURE_GATE_STAGE`, `FAILURE_SQLSTATE`, `FAILURE_HTTP_STATUS`, and the preceding safe `PASS` lines. **Do not share private local integration logs.** If any stage is not in that constrained output, stop rather than guess.

### Deferred release prerequisites

- Five real independently verified daily reference feeds, per-game publication/reset proof; no guessed seeds/points.
- Independent deployed Edge gateway/JWT/RLS staging tests and release smoke.
- Restored-user Auth login plus full platform/Realtime/SMTP/Storage/cron/secret recovery and rollback readiness.
- End-to-end secure email-code recovery remains explicitly deferred without proof.
- One final responsive/PWA/Share Target/reviewer/deletion request owner UAT after guarded deployment.

Original 13 SQL migration files, the 3 proposed polishing migrations, frozen scores, original shares and award history are **not modified by this correction**. No production acceptance is claimed.
