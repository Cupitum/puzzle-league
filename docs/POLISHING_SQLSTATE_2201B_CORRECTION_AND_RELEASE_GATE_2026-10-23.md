# Puzzle League Polishing — PostgreSQL URL regex repair and remaining release gates

**Status (23 October 2026): SOURCE FIX PREPARED; live-local SQL verification and production acceptance OPEN.**

## Confirmed failure and cause

Owner's synthetic local GoTrue/PostgREST integration created four accounts and two private leagues, then failed in `identity_operator_registration`. Its safe diagnostic gave `SQLSTATE 2201B`, PostgreSQL `invalid_regular_expression`.

The source migration `20261023100200_polishing_identity_evidence.sql` had the expression `^https://[^ ]{4,500}$` in BOTH the `source_url` constraint and `p7_register_daily_reference`. PostgreSQL regex bounded repetition arguments must be <=255. The expression `{4,500}` was not valid PostgreSQL, even though JavaScript-source tests passed.

## Narrow forward correction (candidate migration #16 ONLY)

The replacement checks retain the previous intended URL range (HTTPS prefix + 4..500 characters), replacing the unsupported bound with:

- `^https://[^[:space:]]{4,}$` for HTTPS prefix, at least 4 non-whitespace characters, and no whitespace anywhere in the suffix;
- `char_length(source_url) between 12 and 508` (8-character `https://` prefix, 4..500 remaining characters);
- explicit NULL and length rejection inside the trusted operator function.

Existing thirteen baseline migrations, approved scoring rules, historical submissions and awards are UNMODIFIED. The third polishing migration has never been evidenced as applied to hosted production; if any durable environment has already applied it, do not rewrite migration history. Use a new corrective migration after reconciling that environment.

## Added end-to-end regression

`supabase/tests/polishing_identity_reference_real_sql_gate.sql` uses a transaction and `ROLLBACK`, and runs through the real PostgreSQL operator function and lookup with synthetic Wordle ID `999999998`. It validates the 508-character upper bound, rejection of 509 characters, short/non-HTTPS/whitespace/newline URLs, and unchanged league award counts. It catches ONLY SQLSTATE `22023` for negative inputs. This is invoked before the ordinary synthetic operator/reference integration; there is no historical replay or real-data write.

The synthetic local runner now surfaces only sanitized `FAILURE_GATE_STAGE`, `FAILURE_SQLSTATE` and `FAILURE_HTTP_STATUS` fields in case of failure; never paste the private logs or environment file.

## Evidence vs open gate

Previously owner-confirmed:
- Existing candidate: local identity/security tests, TypeScript, lint, Vitest and production build passed.
- Isolated 16-migration synthetic application and real-local GoTrue/JWT/PostgREST matrix had previously passed before migration #16 was introduced (the 15-migration baseline).
- October 21 hosted backup restored into an isolated database with historical counts and FK audit PASS; missing Auth trigger reconstructed from hash-verified Phase 3 source and one Realtime role grant omitted. Restored-user sign-in and full platform parity are NOT established.

New fix checks in packaging session:
- New targeted SQL-regex static suite PASS (5 tests); full identity/Edge relevant Node suites PASS. Actual PostgreSQL integration of the corrected migration **NOT RUN in packaging environment**.

Still required before hosted release:
1. Owner Ubuntu unified `complete_polishing_local_gate.sh`, including disposable real Postgres URL boundary test and synthetic authorization matrix.
2. Fresh source/migration diff and remote read-only audit; real trusted evidence provenance for all five games (unverified references always remain pending).
3. Latest backup/readiness and isolated restore parity including Auth/Edge/secrets/Storage/cron/SMTP and tested rollback or explicit blocking deferrals; no live destructive tests.
4. Deployed Edge runtime, private-league/RLS, mobile accessibility/PWA, Share Target and account flows verified in guarded release.
5. Emailed-code password recovery stays **deferred** until Supabase/Brevo code delivery and replay protection proven end to end; never claim it works based on SMTP configuration alone.
6. One consolidated owner UAT acceptance before resuming Step 12 and wider pilot.

Do not push to `main`, apply hosted migrations or deploy the site based solely on offline results.
