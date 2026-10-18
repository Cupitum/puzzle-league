# Puzzle League — Phase 6 remaining results and release readiness

**Prepared:** 18 October 2026. **Required Git anchor:** `2f01d63` (owner-reported clean and pushed). **Scope:** Wordle #1946, Minute Cryptic 17 October 2026, FoxiMax #1512. **No migrations, no awards, no approval decisions, no updates to submitted shares.**

## External puzzle evidence (research, not user authentication)

| Game | Observed published evidence | Confidence and limitation |
|---|---|---|
| Wordle #1946 | Wordle #1946 = **17 October 2026**. Tom's Guide previous-day page: https://www.tomsguide.com/news/what-is-todays-wordle-answer ; independent archive https://www.wordlegroup.com/boards | Corroborated **number–date mapping**, not origin of the individual share or league eligibility. |
| Minute Cryptic, 2026-10-17 | Official Minute Cryptic site `https://www.minutecryptic.com/` (observed source on 18 Oct) identifies 17 October clue: **“Fudge: best idea when you have high blood sugar?” (8)**, by Member Rob D. The date-specific third-party archive `https://www.sportsdunia.com/gaming/minute-cryptic-answer-today-october-17-2026` corroborates the clue. | Official **date/clue** evidence exists, but the report must confirm it matches the immutable shared text. The plain text remains editable by its submitter; exact hint taxonomies and account authenticity are not proven. The official homepage changes daily, so cite the dated third-party article too. |
| FoxiMax #1512 | Official `https://foximax.com/` separates **Daily** and **Training**, including daily reset preferences. | **No reliable official or archive number–date mapping established** for #1512. Facebook snippet with #1512 is not sufficient to infer a date or daily-mode entitlement. |

These links are references for the human reviewer. The tool does **not** visit any site during execution, is not official game integration, and does not write `verification_state` or `puzzle_day`.

## Install and single final local gate

1. Unzip the package **outside** `~/Desktop/Development/Puzzle_League`; do not replace `.git` or copy over existing migrations.
2. From the extracted package directory, run:

```bash
bash INSTALL_TO_REPO.sh "$HOME/Desktop/Development/Puzzle_League"
cd "$HOME/Desktop/Development/Puzzle_League"
bash scripts/phase6/remaining-local-gate.sh
```

The gate calls existing `scripts/phase6/verify.sh`, the new ten pure Node evidence tests, and `remaining-results.mjs --read-only` on the existing local Docker PostgreSQL. It requires current committed source `2f01d63`, the original audited parser SHA-256, and **13 local migrations**. Report location (not Git): `~/Desktop/Puzzle_League_Backups/phase6_reconciliation/remaining_three_private_evidence.json`, mode 0600. The script reads raw shares into memory to compare clue/number but **never prints shares, UUIDs, account IDs, or hashes**. Store backups and reports privately.

**Fail-closed preconditions:** exactly one pending each for Wordle, Minute Cryptic and FoxiMax; one local Supabase DB container; all source and DB guards. All three are explicitly classified `RETAIN_PENDING_NO_AWARD` regardless of date evidence. Monitors hashes across nine important application tables before and after the read-only queries; any drift fails the gate. Re-running is read-only and overwrites only the private report.

**After PASS:** Review the three private records and their independent evidence. A moderator still needs (a) verified source puzzle identity and daily mode, (b) league timezone + 48-hour window or historical exception, (c) account/membership and season snapshot checks, (d) existing review requests and authorisation, and (e) audited submission/award transitions. In particular the absence of FoxiMax #1512 mapping must remain a blocker. **No manual SQL updates or reviewer shortcuts** are part of this package. Existing Polygonle #1539 recovery remains pending moderation and is not eligible for automatic points.

## Hosted release gates (not verified here)

- GitHub Actions: confirm actual workflow run, conclusion and commit SHA, not just a Git push.
- Managed Supabase: secure credentials/role separation, applied production migrations and application audit/RLS/edge deployment; backup and independently verified recovery with operational plan, no client service-role secret.
- Cloudflare Pages: managed hosting, HTTPS, custom domain/origin behavior, deployment controls and smoke tests.
- Android: installed PWA Share Target on actual HTTPS origin, original-game Share > app preview > confirmation > authenticated server outcome; paste fallback, denied permissions and offline behavior.
- Real ~5–10-person five-game pilot: actual eligible submissions, per-league standings, streak/history, late/mode/duplicate moderation, cross-league calculations, season finalisation and corrections; collect issues before release.

**Verdict:** This package may close a *read-only local evidence/pre-release checklist gate*. It **cannot** close Phase 6 overall, enable a live release, or adjudicate pending rows automatically. Independent hosted/manual gates are mandatory.

## Source-control

After a true PASS, stage only the added `scripts/phase6/remaining-*`, `scripts/phase6/tests/remaining-results.test.mjs`, `scripts/phase6/remaining-local-gate.sh` and this doc. Review `git diff --cached --check` and full diff for secrets, then make a normal commit/push. **The current local package is not claimed to have been installed, committed, or pushed.** Once a new commit is made, the exact source-pinned scripts will need a deliberate update for the *next* phase; do not disable the anchor simply to re-run on another commit.
