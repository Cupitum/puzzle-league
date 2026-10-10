# Puzzle League — local application foundation

**Checkpoint:** Phase 2 / Block 1 / Steps 1–3 preparation, 2026-10-10. No production app, accounts, database, Android Share, real game submission or awarded league points.

This skeleton proposes React / TypeScript / Vite, Supabase backend and Cloudflare Pages hosting. Stack selection awaits owner acceptance; no remote services have been created. It carries the previously approved five game identifiers without implementing scoring or ingesting live results.

- `src/` — intentionally minimal frontend and catalogue contract checks.
- `research/phase1-approved-local-poc/` — **byte-for-byte** preserved 35-file Python Phase 1 artifact, including 76-test baseline and pseudonymised five-game fixtures. Do NOT port or modify it silently.
- `research/phase1-sha256-manifest.json` — SHA-256 of each originally uploaded Python POC file.
- `docs/ARCHITECTURE_PHASE2_BLOCK1.md` — recommended stack and concerns.
- `docs/WINDOWS_QUICKSTART.md` — PowerShell verification commands.
- `docs/PROJECT_GUIDE_v1.8.md` — authoritative updated checkpoint, same as separate Markdown download.

## Basic commands

```sh
node scripts/preflight.mjs
node --test tests/foundation.test.mjs
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

`npm install` requires online registry access. The sandbox used to author the skeleton does not have registry DNS access, so a real dependency install/build and local Vite launch remain NOT TESTED. Do not claim Phase 2 Block 1 PASS until they run successfully in the developer environment and architecture choice is accepted.

To rerun Python reference tests:

```sh
cd research/phase1-approved-local-poc
python -m unittest discover -v
```
