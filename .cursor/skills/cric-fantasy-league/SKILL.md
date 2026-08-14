---
name: cric-fantasy-league
description: >-
  Guides development of the Cric Fantasy League app — a self-hosted, season-long
  salary-cap head-to-head fantasy cricket website (CricBattle-style, IPL format).
  Use when working in the Cricket Fantasy App repo, continuing the feature-branch
  roadmap, or implementing auth, squads, transfers, H2H leagues, scoring, or
  live cricket data sync.
---

# Cric Fantasy League

## What this project is

Private **salary-cap** fantasy cricket league (not draft, not auction). **12 fantasy teams**, head-to-head round-robin, IPL-style playoffs. Hosted as a **Next.js website**.

Inspired by CricBattle; built by extending [sanaro99/fantasy-cricket](https://github.com/sanaro99/fantasy-cricket) (GPL-3.0).

## Current state (update when phases merge)

| Item | Status |
|------|--------|
| Base fork + git structure | Done (`main`, tagged `v0.1.0-foundation`) |
| Auth (NextAuth + bcrypt) | Done (merged `main`, tagged `v0.2.0-auth`) |
| League schema (Phase 3) | Done (merged `main`, tagged `v0.3.0-schema`) |
| Squad builder (Phase 4) | Done on `feature/04-salary-cap-squad` (pending merge → `v0.4.0-squad`) |
| Docs: ROADMAP, BRANCHING, ARCHITECTURE, UPSTREAM, DEVELOPMENT, DATABASE | Done |
| **Next work** | Merge Phase 4, then `feature/05-league-h2h` |
| Data | Upstream uses Sportmonks → plan **CricAPI** in phase 09 |

Before coding, read `docs/BRANCHING.md` for the active feature branch and dependency order.

## Stack

- **App:** Next.js 15, React, Tailwind (Pages Router from upstream)
- **DB:** Supabase/Postgres (migrations in `supabase/migrations/`)
- **Target auth:** NextAuth (email/password, session: `teamId`, `teamName`, `isAdmin`)
- **Target scoring:** CPL rules (see [reference.md](reference.md))
- **Package name:** `cric-fantasy-league`

## Git workflow (required)

1. One feature branch at a time; branch from latest `main`.
2. Implement + test on `feature/XX-name`, merge `--no-ff` to `main`, tag milestone.
3. Commit prefixes: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
4. Never commit `.env.local` or API keys.
5. Only create git commits when the user asks.

Feature branches (in order): `01-foundation` ✓ → `02-auth-nextauth` ✓ → `03-database-schema` ✓ → `04-salary-cap-squad` → `05-league-h2h` → `06-transfers-locks` → `07-auto-sub` → `08-scoring-engine` → `09-live-score-sync` → `10-playoffs` → `11-admin-panel` → `12-ui-pages` → `13-player-pool-stats`.

## Product rules (do not drift)

Summarized here; full detail in [reference.md](reference.md) and `docs/ROADMAP.md`.

- **Squad:** 16 players (12 playing + 4 bench). Slots: 1 WK, 5 BAT, 5 BOWL, 1 FLEX. AR fills BAT or BOWL.
- **Cap:** 120 credits; variable prices; budget updates on every swap.
- **Captain / VC:** 2× / 1× (no VC bonus beyond base per CPL spec).
- **Auto-sub:** Non-playing starter → highest-scoring bench player who played.
- **Transfers:** Lock-to-lock; 1 free/match (max 10 banked); 56 group stage, 8 playoffs (0 free).
- **League:** 11-round round-robin (66 fixtures); W/D/L = 2/1/0; top 6 playoffs.
- **Locks:** Per IPL team at match start; double-headers lock independently.
- **Admin:** Configurable squad structure rules; first user = admin.
- **v1 scope:** Single private league; no overseas limits; no real money.
- **Player pool (Phase 13):** Tournament stats + form badge (in form / average / out of form) on pool cards; requires scoring + live data sync first.

## Code conventions

- Minimize scope; match upstream patterns until a subsystem is replaced.
- Pure logic for scoring, auto-sub, fixture generation (unit-testable).
- Port auto-sub patterns from [wwc-draft](https://github.com/nishantsingodia/wwc-draft) `effective-lineup`.
- Port scoring sync ideas from [wwc-points-bot](https://github.com/nishantsingodia/wwc-points-bot).

## Key paths

| Path | Purpose |
|------|---------|
| `docs/ROADMAP.md` | Phased checklist |
| `docs/BRANCHING.md` | Branch workflow |
| `docs/ARCHITECTURE.md` | Domains + upstream migration |
| `docs/UPSTREAM.md` | Base repo + reference projects |
| `docs/DEVELOPMENT.md` | Local setup |
| `pages/api/` | Existing API routes (selections, locks, leaderboard) |
| `supabase/migrations/` | SQL migrations |
| `docs/DATABASE.md` | Schema reference + migration order |

## When starting a new chat

1. Read this skill and `docs/BRANCHING.md`.
2. `git branch` — confirm which feature branch is active.
3. Check `docs/ROADMAP.md` for the current phase checklist.
4. Continue on the open feature branch; do not skip dependency order without user approval.

## Updating this skill

After merging a feature phase to `main`, update the **Current state** table above (next branch, completed items).
