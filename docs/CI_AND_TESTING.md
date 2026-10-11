# Phase 2 Block 2 — Automated quality gate

This is a local + future GitHub Actions **specification**, not evidence of a remote CI run.

## Commands and what they establish

1. `npm.cmd ci`: installs the *committed lockfile* without changing dependency selections (requires access to npm registry). Use `npm.cmd`, not `npm.ps1`, in PowerShell.
2. `npm.cmd run verify:offline`: checks `.env.example`, tracked environment-file policy (only with `.git`), immutable 35-file Python source SHA-256 manifest, source structure and CI wiring. Works with built-in Node modules even without npm dependencies.
3. `npm.cmd run test:research`: runs `py -3 -m unittest discover -q` from the immutable research directory on Windows; `python3 ...` on Linux. Prior Phase 1 acceptance baseline was **76/76**; rerun on the actual environment rather than assuming it still passes.
4. `npm.cmd run typecheck`: strict `tsc -b`.
5. `npm.cmd run lint`: `oxlint src`.
6. `npm.cmd test`: Vitest tests including five-game contract-ID equality and public-config validation.
7. `npm.cmd run build`: TypeScript and Vite production-mode build to ignored `dist/`; not a deployment.
8. `npm.cmd run check`: runs steps 2–7 in sequence. The command stops on the first failure.

**Interpretation:** a successful local `npm.cmd run check` is a reproducible *frontend foundation quality gate*; it does not verify server authorization, scoring, puzzle-date identity, actual Android sharing or hosted CI.

## GitHub Actions

`.github/workflows/verify.yml` requests read-only repository permissions, runs on `main` pushes, pull requests and manual dispatch, uses Node 24 (from `.nvmrc`), Python 3.13 and `npm ci`; then executes the same `npm run check`. It uses `actions/checkout@v7`, `actions/setup-node@v7`, `actions/setup-python@v7`, and deliberately does not install a Supabase CLI, invoke deployments or reference GitHub repository secrets. The actions' published main-branch documentation was reviewed 2026-10-11; GitHub may change those releases in the future.

**Verification boundary:** YAML parsed locally != workflow executed on GitHub. CI status remains **NOT RUN REMOTELY** until the owner creates/links a private GitHub repository and provides an actual Actions run result. A private GitHub repo is still optional at this Phase 2 checkpoint; no GitHub project was created.

## Manual acceptance on the original Windows Git repository

```powershell
git rev-parse --short HEAD
npm.cmd ci
npm.cmd run check
git diff --check
git status --short --branch
```

Also launch `npm.cmd run dev` and confirm the placeholder page remains visible. Verify no `.env` or raw WhatsApp chat file is tracked via `git ls-files`. Review the exact patch, then commit only on **successful local checks** and capture the new Git SHA and clean `git status --short --branch`. The new authoritative guide must retain `PENDING` for any unobserved Windows or GitHub verification.

## Limitations / gaps

- Current TypeScript/Vitest tests are foundation assertions, **not** parser parity tests with the Python POC.
- Offline verification is not comprehensive secret detection or a production threat model.
- The future CI depends on npm/GitHub availability and runner compatibility; no secret credentials are necessary.
- GitHub Actions' Ubuntu runner is not an Android device test; that is reserved for Phase 6.
