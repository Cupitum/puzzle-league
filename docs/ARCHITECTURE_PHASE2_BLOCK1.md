# Puzzle League — Phase 2 Block 1 proposed technical decision record

**Date:** 2026-10-10 | **State:** PROPOSED; awaiting owner acceptance and user-device validation.

## Recommended architecture

- Android-first browser application: **React 19 + TypeScript 6 + Vite 8**, mobile-first responsive UI. PWA manifest/service worker and Android share target remain Phase 6 work; do not claim those are implemented.
- Code and private history: **Git**, optional private **GitHub** repository. No remote created.
- Auth/persistence: **Supabase Auth + Postgres**, with strict database grants/RLS. Proposed, no Supabase project provisioned.
- Trusted writes: Supabase Edge Functions and/or Postgres database functions with authenticated, server-verifiable identity; server-exclusive secrets. Frontend must NOT award points.
- Static hosting: **Cloudflare Pages**. No deployment, domain or HTTPS verified.
- Frontend tests: **Vitest 5**, lint with **Oxlint**, TypeScript strict checks. Python POC preserved verbatim as research evidence; no premature translation of parsing/scoring logic.
- Runtime target: **Node.js 24 LTS** (Node >=22.12 is compatible with current Vite/Vitest toolchains). Validate versions on developer PC before marking step complete.

## Why this arrangement

A static mobile-first client can use Android browser installation and standard browser fallback. Auth and data remain server-side, and published leaderboards may expose nicknames but not credentials or private league contents. A central result submission should be allocated to all eligible leagues only after validation (later phases), while unique `(account, game, puzzle)` identities and frozen season scoring versions are database-side responsibilities.

### Tentative costs and operational limits (verify before production)

- Supabase Free: 2 active projects, 500 MB DB per project, 50k MAU, projects may pause after 7 days idle, no automatic backups on Free; Pro starts around US$25/month. No card or service has been provisioned.
- Cloudflare Pages Free: up to 500 builds/month, subject to product limits.
- GitHub Free: private repositories available.
- Local editor/runtime and npm packages are free/open-source (subject to their licences); no paid subscription required for Phase 2 testing.

## Why not host an always-on Python backend now?

The Python parser is proven as **standalone local research code**, not as a security-hardened ingestion service. Keep it frozen until Phase 4 makes an explicit integration/port decision; server-side enforcement is still required whether this becomes TypeScript or Python at a later date. No public client credential may bypass server authorization.

## Open architectural decisions

1. Owner accepts or revises the proposed service providers, particularly free-tier pause and backup limitations.
2. Actual Windows developer environment Node/npm/Git availability has not been observed. Do not treat sandbox Node/npm/Git as the user's PC.
3. Phase 2 Block 2 to choose CI/secrets and final package boundaries, and Phase 3 onward to define tables and security rules.
4. Vite PWA plugin compatibility and real Android share target are deferred to Phase 6.

## Verified public references (checked 2026-10-10)

- https://vite.dev/blog/announcing-vite8 — Vite 8 Node minimum
- https://nodejs.org/en/about/previous-releases — Node.js LTS releases
- https://vitest.dev/guide/ — Vitest Node and Vite compatibility
- https://supabase.com/docs/guides/platform/billing-on-supabase — free-tier quotas
- https://supabase.com/pricing — free-tier pauses and pricing
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS guidance
- https://developers.cloudflare.com/pages/platform/limits/ — hosting free limits
- https://docs.github.com/en/get-started/learning-about-github/githubs-plans — private repositories
