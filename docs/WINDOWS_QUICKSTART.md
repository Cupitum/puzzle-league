# Puzzle League — verify Phase 2 Block 1 on your Windows PC

These instructions are for PowerShell on Windows 10/11. Use the folder **puzzle-league** from the extracted ZIP, not the ZIP itself. No Supabase/Cloudflare/GitHub account required yet.

## 1. Check what is installed (send actual output)

```powershell
node --version
npm --version
git --version
py --version
```

Node.js **24 LTS** is the recommended target. A supported >=22.12 Node version is compatible with the declared foundation packages. Missing commands need installation before proceeding. Download Node from https://nodejs.org and Git from https://git-scm.com; VS Code from https://code.visualstudio.com if needed.

## 2. Make and verify a local folder

```powershell
# Extract ZIP with Explorer, then open PowerShell and switch to its puzzle-league folder.
cd "$HOME\Desktop\puzzle-league"
node .\scripts\preflight.mjs
node --test .\tests\foundation.test.mjs
```

The offline tests verify package structure and hashes for the immutable 35-file Python research snapshot; they do not verify a Vite install. Nothing in this command modifies your PC outside the extracted folder.

## 3. Install and run the starter (needs npm internet access)

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Open the **Local:** URL printed by Vite (usually `http://localhost:5173`), not a guessed deployed URL. The local placeholder page is NOT a live Puzzle League app. Stop with Ctrl+C.

Then run `git init -b main` inside the project directory and `git status --short` if Git is available; make an initial private commit only after review. The app starts locally before a GitHub remote is needed.

Please send the preflight/command outputs (especially any errors), rather than assuming the local setup passed. If `npm install` creates `package-lock.json`, **retain it** for reproducible installs and later CI. Do not expose or upload `.env` secrets or any private unredacted WhatsApp archive.

## Known testing limitation

This preparation environment cannot reach the npm registry, so an actual `npm install`, React/Vite clean launch, Vitest run, lint and TypeScript build are **NOT TESTED** here. Offline Node tests and Python tests are separately observed. Their successful results cannot be substituted for your Windows PC's run.
