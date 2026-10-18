# Phase 6 operator evidence matrix — statuses are NOT VERIFIED until demonstrated

**Source:** Prepared against `ab7122b`; no real provider/device evidence included. Record **date, exact commit or migration IDs, verifier and redacted evidence** for each PASS. Do not record player passwords, personal emails, raw result shares, JWTs, service-role keys or private backup contents in shared evidence.

| Gate | Acceptance evidence to collect | Status |
|---|---|---|
| GitHub-hosted quality CI | Two hosted workflow run IDs/conclusions on exact release SHA; no secrets | NOT VERIFIED |
| Production target identity | Operator-approved Supabase project ref/region/environment; no localhost | NOT VERIFIED |
| Remote DB schema | All 13 migrations correctly applied; RLS, constraints, audit tested; no old data imported | NOT VERIFIED |
| Edge Auth and permission tests | Deployed `competition`; real Auth JWT positive/negative users, private isolation | NOT VERIFIED |
| Unattended cron | Actual `p4_tick` schedule and successful worker run, not just job row | NOT VERIFIED |
| Backup/recovery | Private remote logical backup + restore to separate target, fingerprints, documented RPO/RTO | NOT VERIFIED |
| Frontend deployment | HTTPS Pages verified with matching SHA, origin and no secret bundle, project-specific production CSP and response headers | NOT VERIFIED |
| Auth emails and abuse controls | Confirm email delivery, limits, failure handling and account provisioning | NOT VERIFIED |
| Hosted anonymous smoke | HTTPS manifest, service worker and unauthenticated Edge denial | NOT VERIFIED |
| Installed Android Share Target | Real Android OS/browser/version, original-game Share > installed PWA, original result text | NOT VERIFIED |
| Android paste/offline | Paste fallback, refresh/relaunch, offline error and retry, session persistence | NOT VERIFIED |
| Real pilot membership | 5–10 consented players, at least two leagues, active and former membership visibility | NOT VERIFIED |
| Five supported games | Authentic Wordle, Minute Cryptic, FoxiMax, Polygonle, Krillion formatting and review handling | NOT VERIFIED |
| Scoring/leaderboards | Approved five rules; +1 participation eligible, no skipped, correct combined/per-game, streak separate | NOT VERIFIED |
| Moderation and identity | Unverified mode/date pending without award, review segregation, correction audit, no self-approval | NOT VERIFIED |
| Duplicate/late/season | One share across leagues, deduplication, 48h window, renewal/finalisation observable | NOT VERIFIED |
| Monitoring/release governance | Alerts/log redaction, owner/rollback procedure, issues triaged, cost/quotas documented | NOT VERIFIED |

**Pilot record template (keep privately):** anonymous player handle; device/browser; game; puzzle number/date/mode evidence; submission date; eligible league IDs; trusted result state; points per league; current/longest streak; test type; observed outcome; reviewer; issue ID (not raw text). Use a new private pilot tracker; do not place account emails or real shares in the public Git repository.

**Pilot sequencing:** Controlled staging-like hosted setup (no auto-awards without identity proof) → hosted Auth/Edge/RLS → installed Android Share → 5-game representative pilot → season rollover and reconciliation → formal release approval. No cloud deployment or pilot claimed by installing this package.
