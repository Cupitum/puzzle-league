# Puzzle League — Phase 2 frontend foundation

**Approved architecture (2026-10-10):** React + TypeScript + Vite; future Supabase Auth/PostgreSQL/RLS/trusted server functions, Cloudflare Pages, Git/private GitHub, Android-first PWA with paste fallback. The currently running application is **only a local placeholder**: no backend, accounts, persisted data, real parsing or submissions, eligible scores, seasons, Android Share Target or public deployment.

**Repository handover:** Phase 2 Block 1 is owner-verified COMPLETE / PASS at commit `3f87610`. Phase 2 Block 2 / Steps 4–6 adds structure, configuration rules and CI files; these changes require tests and a new commit on the owner's actual Windows repository before Block 2 can be declared PASS. The original guide is retained as `docs/PROJECT_GUIDE_v1.9.md`; the older `docs/PROJECT_GUIDE_v1.8.md` is historical. The newer detached v2.0 checkpoint controls this handover.

## Start on Windows PowerShell

```powershell
node --version
npm.cmd --version
py --version
git --version
npm.cmd ci
npm.cmd run check
npm.cmd run dev
```

Open the **Local** Vite URL printed by the terminal, then stop with Ctrl+C. The production build creates local `dist/` assets only; it does not deploy anything. `npm.cmd` avoids PowerShell execution-policy friction. The committed `package-lock.json` makes `npm.cmd ci` reproducible.

## Verification commands

- `npm.cmd run check` — offline safety/preservation tests, original 76 Python research regressions, strict TypeScript, Oxlint, Vitest and Vite build (requires installed npm packages and Python).
- `npm.cmd run verify:offline` — dependency-free Git-ignore/env policy and Node preservation checks.
- `npm.cmd run test:research` — dependency-free preservation of the Python research tests.
- `npm.cmd run dev` — browser-only placeholder (no live integrations).

## Repo map

- `src/ui/` — React placeholder page and presentation styles.
- `src/domain/games/` — five-game catalogue pointers to owner-approved version identifiers.
- `src/domain/results/` — type-only parser/scoring research reference vocabulary, **not a parser or scorer**.
- `src/config/` — safe public-only display-stage config.
- `src/infrastructure/` — future services boundary; no adapters active.
- `research/phase1-approved-local-poc/` — **immutable 35-file** Phase 1 Python parser/scoring prototype and pseudonymised corpus; manifest in `research/phase1-sha256-manifest.json`.
- `.github/workflows/verify.yml` — CI specification; **not confirmed to run on GitHub until a private remote is created and the workflow executes**.

See `docs/MODULE_BOUNDARIES.md`, `docs/CONFIGURATION_AND_SECRETS.md`, `docs/CI_AND_TESTING.md`, and `docs/WINDOWS_QUICKSTART.md`. Do not commit local `.env` files or raw private conversation exports. The 5-rule approved scoring contract is preserved as a research snapshot; no awardable scoring is implemented here.
