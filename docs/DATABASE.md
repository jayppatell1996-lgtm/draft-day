# Database Schema

Postgres via Supabase. Migrations live in `supabase/migrations/` and are applied with Node scripts using `DATABASE_URL`.

## Migration order

| Script | SQL file | Purpose |
|--------|----------|---------|
| `node --env-file=.env.local scripts/migrate-auth.js` | `20250814_nextauth_users_teams.sql` | Auth: `fantasy_teams`, `league_users` |
| `node --env-file=.env.local scripts/migrate-cache.js` | `20250419_create_cache_tables.sql` | Sportmonks cache tables |
| `node --env-file=.env.local scripts/migrate-league-schema.js` | `20250815_league_core_schema.sql` | **Phase 3** league engine tables |

## Entity overview

```
leagues
  ├── fantasy_teams ── league_users (auth)
  ├── players ── player_prices
  ├── squads ── squad_slots
  ├── squad_structure_config
  ├── rounds ── h2h_matchups
  ├── fixtures ── lock_times
  ├── transfers ── trade_log
  └── (upstream) fixture_cache, squad_cache
```

### Auth (Phase 2)

| Table | Purpose |
|-------|---------|
| `fantasy_teams` | One row per fantasy team; linked to `leagues` |
| `league_users` | Email/password auth; FK to `fantasy_teams`; `is_admin` |

### League core (Phase 3)

| Table | Purpose |
|-------|---------|
| `leagues` | League config: salary cap (120), max teams (12), season label |
| `players` | Player pool per league; external API id, role, franchise |
| `player_prices` | Variable pricing history (`effective_to` NULL = current) |
| `squads` | One squad per fantasy team; budget, C/VC, free trades banked |
| `squad_slots` | 16 slots: WK/BAT/BOWL/FLEX (playing) + BENCH |
| `squad_structure_config` | Admin-editable slot counts (default 1/5/5/1 + 4 bench) |
| `rounds` | 11 round-robin rounds (+ playoff rounds later) |
| `h2h_matchups` | Fantasy team vs fantasy team per round |
| `fixtures` | Real cricket matches synced from API |
| `lock_times` | Per-franchise lock deadline per real fixture |
| `transfers` | Player in/out swaps with price delta |
| `trade_log` | Append-only audit trail (action + JSON payload) |

### Upstream (interim)

| Table | Purpose |
|-------|---------|
| `fixture_cache` | Cached Sportmonks fixture JSON |
| `squad_cache` | Cached Sportmonks squad JSON |
| `player_selections` | Legacy per-match picker (replaced in Phase 4+) |

## Default league

Migration seeds one league:

- **ID:** `00000000-0000-4000-8000-000000000001`
- **Name:** Cric Fantasy League
- **Season:** CPL 2026
- **Status:** `draft`

Existing `fantasy_teams` from signup are attached to this league automatically.

## Conventions

- **UUID** primary keys (except cache tables)
- **Roles:** `WK`, `BAT`, `BOWL`, `AR` on players; slots use `WK`, `BAT`, `BOWL`, `FLEX`, `BENCH`
- **H2H result:** `home_win`, `away_win`, `draw`, `no_result`
- **Prices:** `NUMERIC(6,2)` credits

## Next phases

| Phase | Uses these tables |
|-------|-------------------|
| 04 — Salary cap squad | `squads`, `squad_slots`, `players`, `player_prices` |
| 05 — League H2H | `rounds`, `h2h_matchups` |
| 06 — Transfers & locks | `transfers`, `trade_log`, `lock_times` |
| 09 — Live data | `fixtures`, `lock_times` (CricAPI sync) |
