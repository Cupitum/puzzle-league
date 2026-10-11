# Phase 2 Block 2 — Source/module boundaries

**Status:** Foundation architecture only; no parser port, backend, database or league feature implementation.

| Path | Responsibility | Phase 2 guardrail |
|---|---|---|
| `src/main.tsx` | Browser entrypoint | Mounts placeholder UI only |
| `src/ui/` | React view and CSS | Display-only; no score awarding |
| `src/domain/games/catalog.ts` | Immutable five-game display IDs and approved scoring-version references | No executable scoring logic; contract values tested against Phase 1 JSON |
| `src/domain/results/contracts.ts` | Type-only reference vocabulary for research parser states and *candidate* puzzle identifiers | Does not promise production wire compatibility, parsing, game/date verification or awards |
| `src/config/` | Public-only configuration parsing | No secrets or authentication handling |
| `src/infrastructure/` | Documentation placeholder for future trusted service adapters | No runtime adapter in Phase 2 |
| `research/phase1-approved-local-poc/` | Immutable Python parser/scorer, tests, pseudonymised fixtures | 35 files SHA-256 verified; do not edit or automatically port |
| `research/phase1-sha256-manifest.json` | Research-preservation integrity baseline | Enforced by offline tests |
| `tests/` | Node offline repository/preservation safety checks | Can run without npm dependencies |
| `src/**/*.test.ts` | Vitest frontend/domain contract tests | Does not replace Python's 76-test POC suite |

**Single npm package:** no monorepo, package workspace or extra runtime dependency until justified by a later phase. UI imports display-only domain data. Domain types must not import React, Supabase, network or storage modules. Keep the future sequence: Phase 3 database/security, Phase 4 trusted parser+scoring integration, Phase 5 leagues/seasons, Phase 6 PWA and Android Share Target. Do not treat TypeScript interfaces as a verified parser implementation.

**Five immutable rule identifiers:** `wordle-fixed-v1-approved`, `minute-cryptic-hints-v1-approved`, `foximax-original-n8-v1-approved`, `polygonle-standard-v1-approved`, `krillion-daily-absolute700-v1-approved`. Their actual formulae live in the preserved approved Phase 1 Python/JSON. The JS catalogue is a pointer, not an implementation.
