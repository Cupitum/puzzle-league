# Puzzle League — Phase 2 Block 2 Windows PowerShell handover

This extends the developer's **existing clean `3f87610` Git repository**, not a fresh `git init` or a replaced project. Work only on **Steps 4–6**. The public frontend still displays a placeholder. Do not add secrets or enable Supabase, hosting, database or PWA functionality.

## 0. Confirm the original Git source before changes

Open PowerShell in the real `puzzle-league` project directory recorded in the v1.9 guide (or its new location).

```powershell
git status --short --branch
git rev-parse --short HEAD
```

Expected *before patching*: `## main` with no changes, and `3f87610`. If local work has been added since then, do **not** overwrite it or force a reset; review/backup the differences before continuing. The source ZIP is a commit archive with no `.git` history and should not replace the live working directory.

## 1. Apply the prepared Phase 2 Block 2 patch once

Place the delivered `.patch` file **outside** the `puzzle-league` project directory (e.g. its parent folder). From inside the existing project root:

```powershell
# Change only the relative file path below if the patch was saved elsewhere.
git apply --check ..\Puzzle_League_Phase2_Block2_Changes_from_3f87610.patch
git apply ..\Puzzle_League_Phase2_Block2_Changes_from_3f87610.patch
```

Do not use `git apply --3way` or `--reject` blindly. If `--check` fails, inspect what differs before proceeding. The patch intentionally reorganizes the placeholder module locations; its deletions of old paths correspond to relocations, **not removal of product features**.

## 2. Run the verifications in order

```powershell
node .\scripts\preflight.mjs
npm.cmd run verify:offline
npm.cmd run test:research
npm.cmd ci
npm.cmd run check
npm.cmd run dev
```

Open the local URL printed by Vite and confirm the five approved games are shown. Stop the dev server with Ctrl+C. `npm.cmd run check` includes both standalone offline checks, so individual calls are helpful diagnostics but not replacements for the full command.

If any command fails, copy the **actual output** and stop before committing; do not claim PASS or begin another phase.

## 3. Review, stage and commit only after PASS

```powershell
git status --short --branch
git diff --stat
git diff --check
# Review the changed paths and contents in your editor before staging.
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "chore: complete Puzzle League Phase 2 foundation"
git log -1 --oneline
git status --short --branch
```

Expect a **new Git commit hash**; do not claim it is `3f87610`. `git status --short --branch` should show a clean `## main` if successful. Commit the approved project guide update only after its verified Windows test results have been recorded. Do not push to GitHub unless separately requested/authorized. CI exists as a workflow file but stays **NOT RUN REMOTELY** until an actual GitHub Actions run happens.

## References

- `docs/MODULE_BOUNDARIES.md` — source layout decisions.
- `docs/CONFIGURATION_AND_SECRETS.md` — `.env` and future Supabase policies.
- `docs/CI_AND_TESTING.md` — commands and evidence interpretation.
- Current separately delivered authoritative v2.0 checkpoint — prepared changes vs verified results.
