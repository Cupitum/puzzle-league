# Phase 2 Block 2 — Configuration and secrets policy

**Status:** Configuration conventions only. No Supabase account/client/server, cloud hosting, real credentials, auth or database exist in Phase 2. Vite's `VITE_` variables are **public to anyone who can inspect the delivered JavaScript bundle**. They are not an access-control boundary.

## Supported environments

| Context | Command / execution | Vite mode | `VITE_APP_STAGE` | Expected public label |
|---|---|---|---|---|
| Local developer browser | `npm.cmd run dev` | `development` | leave blank/unset | `local` |
| Automated frontend unit tests | `npm.cmd test` | `test` | leave blank/unset | `test` |
| Production-configuration build check | `npm.cmd run build` | `production` | leave blank/unset or `production` | `production` |

`src/config/public-env.ts` validates `VITE_APP_STAGE` (`local`, `test`, `production`) and infers it from the Vite mode when empty. It rejects labeling a production build as `local` or `test`. This is a UI-only label, **not proof of environment, permissions or deployment**. Phase 2 has no actual production environment or test server.

- `.env.example` is the only tracked env file: public placeholder values only.
- `.env`, `.env.local`, `.env.production`, `.env.test`, `.env.*` are ignored by Git; never commit, upload, screen-share, paste or archive real secrets. Use `.env.local` only for benign public values at this stage. Vite can read mode-specific `.env` files, but environment values beginning with `VITE_` must be treated as public regardless of file location.
- No credential is needed to run Phase 2 tests, CI, Vite or the production *build*. GitHub Actions checks use no repository secrets and no remote Supabase/Cloudflare environments.
- `scripts/verify-config.mjs` rejects tracked non-example `.env` files (when in a Git repository), forbids nonallowlisted `VITE_` keys in the public `.env.example`, and checks the ignore policy. It does **not** guarantee comprehensive secret scanning. Review every diff before committing and use platform secret scanning on a future private GitHub repository.
- Future client config only **if Phase 3 authorizes it**: `VITE_SUPABASE_URL` (public project URL) and `VITE_SUPABASE_PUBLISHABLE_KEY` (public browser publishable key; legacy anon key treated as public if explicitly adopted). These are **not authentication substitutes**. RLS, authenticated access, server authorization and correct grants are mandatory later.
- **Never expose:** Supabase secret/service-role key (including `sb_secret_*`), `SUPABASE_SERVICE_ROLE_KEY`, database connection strings or passwords, private tokens, JWT signing secrets or admin credentials. No `VITE_` prefix for them, no browser imports, no source-control commits, no Cloudflare *public build* injection. Trusted backend environments/secrets must be configured only when the server component exists in a future phase.
- When real hosting is introduced, supply public-only build settings separately in the hosting provider's configuration and server-only secrets exclusively to trusted server environments. Review previews, logs and audit access; validate project quotas before provisioning.

## PowerShell example (no secrets)

```powershell
# From the project root, optional public-only config:
Copy-Item .\.env.example .\.env.local
# Leave VITE_APP_STAGE= blank. No credentials should be entered.
npm.cmd run check
```

If a developer intentionally sets `VITE_APP_STAGE=local` in `.env.local`, remove the override before `npm.cmd run build`, or set it to `production` for a production-mode build. The build remains local: producing files in `dist/` does not deploy them.
