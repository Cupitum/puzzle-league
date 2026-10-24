# Polishing P-01–P-25 — integrated implementation and release matrix

This is **source candidate coverage**, not a declaration that the production pilot passed.

| Approved item | Candidate implementation / acceptance caveat |
|---|---|
| P-01 / P-25 | Complete league-scoped roster with nickname, full UUID, effective access and selected-member actions. Owner only controls Moderator roles. Real SQL/JWT role matrix owner-reported PASS on preceding 15-migration baseline; retest all 16 migrations. |
| P-02 / D-08 | Accessible action-adjacent messages and scoped async result feedback; review action messages sit immediately beside initiating review; test with keyboard/screen reader. |
| P-03 | One daily puzzle/game card across active joined/owned leagues; same game with legitimately different timezone/day may appear separately. Cross-league live acceptance still pending. |
| P-04 | Native result on Home/Today, never league points; immutable scoring retained. |
| P-05 | Original game Play action, never called an official verification button. |
| P-06 / P-24 | My Results Today summary then filtered chronological historical submissions. |
| P-07 / P-16 | New reference registry and five game contracts. **Conditional:** none of the five official daily provider feeds has been proven trustworthy/automated; verified operator reference required before automatic promotion. Source outage and game-mode ambiguity remain pending. Cannot claim zero unnecessary pending until external provenance established. |
| P-08 | Persistent login and Android PWA Share Target unchanged; prior hosted scoped PASS preserved. |
| P-09 | Dedicated first-season workflow preserved and integrated with My Leagues. |
| P-10 | Public configuration and Cloudflare native SPA fallback preserved. |
| P-11 | Server-derived awarded-day verified streak or unavailable. Comprehensive multi-day/timezone reconciliation is still in consolidated UAT. |
| P-12 / P-18 | Compact vertical mobile cards; 44px navigation touch targets, keyboard focus and adaptive desktop; visual/screen-reader UAT still required. |
| P-13 | Roster/private-league boundaries backend-enforced; explicit no outsider email disclosure. |
| P-14 | Review delegation independent of role, owner-configurable bounded invitation/member capabilities; denied by default. |
| P-15 | Intake placeholder closed; not a feature. |
| P-17 / P-22 | Reorganised league dashboard, Members/Review Queue/Invitations top, secondary/season settings collapsed. |
| P-19 | Separate Share Result action, original confirmation-first flow unchanged. |
| P-20 | Distinct Find Leagues/My Leagues; public discover only, private invitations. |
| P-21 | Alphabetically first accessible league, active relevant season preferred, future season not auto-first; manual override. |
| P-23 | Confirmed-email + fresh-password deletion request with immutable audit, manual trusted admin, status visible. Password recovery via emailed **code** deferred until secure external evidence; sign-in page explains deferral. No automated deletion. |

**D-01 C, D-02 C, D-03 distinct views, D-04 B, D-05 B, D-06 deterministic first, D-07 A, D-08 shared local feedback, D-09 conditional, D-10 A, D-11 C, D-12 preserve, D-13 A, D-14 B, D-15 A, D-16 A retained.**

## Frozen invariant tests

No change to five approved scoring versions or original 13 migrations; no historical score award/backfill; no mutation of original share, accepted review record or past league award. Verified daily sources only; ordinary 48-hour competition window and league/season/join eligibility remain in the original `p4_dispatch` and `p4_award` code. Review suggestions are **read only**. Unsupported modes, stale/conflicting external evidence and provider outage MUST pend. Six older local pending records excluded.

## Remaining non-cosmetic conditional gates before sign-off

1. Genuine independent official game-by-game sources and permission to acquire; secure population of operator-verified reference data and independent day/reset/mode validation. There is no fake current-day seed and no universal generated puzzle number in this archive.
2. Full `npm run check` and disposable **16-migration** Auth/RLS/Edge-handler gate on Ubuntu, with third migration installed. Local package static tests alone do not demonstrate SQL execution.
3. Deployed Edge runtime/gateway end-to-end staging and remote RLS checks, cross-league role matrix, independent/self-review denial.
4. Current hosted state, latest private restore (not just Oct21), real Auth sign-in restore, platform configuration and Realtime permission parity, rollback. This remains a production change blocker.
5. Email-code reset code/SMTP external proof or documented deferral; deletion privacy/retention policy before any real manual erasure.
6. Responsive/mobile/desktop/accessibility/PWA/share testing, one owner UAT, and only then deferred Step 12 broader pilot.
