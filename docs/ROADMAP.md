# Product Roadmap

Season-long **salary-cap head-to-head** fantasy cricket league (CricBattle-style), self-hosted as a website.

**Test tournaments:** CPL 2026, The Hundred, bilateral T20s — before full IPL season.

---

## Phase 1 — Foundation (`feature/01-foundation`)

- [x] Fork base from sanaro99/fantasy-cricket
- [x] Git repo + branch strategy
- [ ] `.env.example`, local dev verified (`npm install && npm run dev`)
- [x] Rename package to `draft-day` (display name **Draft Day**)

## Phase 2 — Auth (`feature/02-auth-nextauth`)

- [x] Email + password signup and login
- [x] Team name at signup (2–30 chars, unique)
- [x] bcrypt hashing (cost 12)
- [x] NextAuth session: `teamId`, `teamName`, `isAdmin`
- [x] First registered user → admin
- [x] Protected routes → redirect to login

## Phase 3 — Data model (`feature/03-database-schema`)

- [x] SQL migration: `20250815_league_core_schema.sql`
- [x] `leagues`, `fantasy_teams` (+ league link), `league_users` (auth)
- [x] `players`, `player_prices` (variable pricing)
- [x] `squads`, `squad_slots` (playing vs bench)
- [x] `rounds`, `fixtures`, `h2h_matchups`
- [x] `transfers`, `trade_log`
- [x] `squad_structure_config` (admin-editable: 5 BAT / 5 BOWL / 1 WK / 1 FLEX)
- [x] `lock_times` (per franchise per real fixture)
- [x] Run migration locally (`scripts/migrate-league-schema.js`)

## Phase 4 — Salary cap & squad (`feature/04-salary-cap-squad`)

- [x] 120-credit salary cap enforcement
- [x] 16-player squad: 12 playing + 4 bench (auto-init slots)
- [x] Role validation (AR fills BAT or BOWL slots)
- [x] Budget deduct/refund on assign/clear
- [x] Squad builder UI at `/squad`
- [x] Player pool seed script (`scripts/seed-players.js`)
- [x] Run seed locally and verify squad builder

## Phase 5 — League format (`feature/05-league-h2h`)

- [x] Round-robin generator (2–12 teams; each pair once; rounds/matchups scale with team count)
- [x] `rounds` + `h2h_matchups` schedule creation (script + admin API)
- [x] W/D/L standings (2 / 1 / 0; no-result excluded)
- [x] `/standings` league table
- [x] `/matchups` head-to-head page per round
- [x] Generate schedule when 2+ teams registered (admin button or `scripts/init-h2h-schedule.js`)

## Phase 6 — Transfers & locks (`feature/06-transfers-locks`)

- [x] 3 free trades per H2H round, max 10 banked
- [x] 8 playoff trades (0 free)
- [x] Lock-to-lock between deadlines (when `lock_times` populated)
- [x] Lock enforced on both sides of a transfer
- [x] Opponent squad hidden until match starts
- [ ] Advance squad submission (future: round snapshots)
- [x] Full trade log per team per round
- [x] Trade limits read from league config (defaults until Phase 11 admin panel)

## Phase 7 — Auto-sub (`feature/07-auto-sub`)

- [x] If playing player doesn't feature → highest-scoring bench player who played fills in
- [x] Applied per match at round score calculation (`lib/effectiveLineup.js`)
- [x] Captain cascade when captain doesn't play (vice gets 2×)
- [x] Unit tests (`npm run test:lineup`)

## Phase 8 — Scoring (`feature/08-scoring-engine`)

CPL rules from spec PDF:

- [x] MoM +50
- [x] Batting: runs, boundaries, sixes, milestones, SR bonus (min 20 runs)
- [x] Bowling: wickets, maidens, hauls, economy tiers
- [x] Fielding: catches, stumpings, run outs (no substitute fielder dismissals)
- [x] Super Over excluded
- [x] `player_match_scores` + `round_fixtures` tables
- [x] Admin submit fixture scores + recalculate H2H round
- [x] Unit tests (`npm run test:scoring`)

## Phase 9 — Live data (`feature/09-live-score-sync`)

- CricAPI for fixtures, squads, ball-by-ball / scorecards
- Lock times stored in DB, shown in MT on free agent cards
- Admin manual score sync trigger
- Locked players greyed out in UI

## Phase 10 — Playoffs (`feature/10-playoffs`)

Top 6 → IPL format:

1. Qualifier 1 (1 vs 2)
2. Eliminator (3 vs 4)
3. Qualifier 2 (loser Q1 vs winner Eliminator)
4. Final

Playoff bracket UI.

## Phase 11 — Admin controls (`feature/11-admin-controls`)

Central admin panel for league operators (first registered user = admin; guard all routes/APIs with `isAdmin`).

- [x] Admin-only `/admin` dashboard (partial)
- [ ] **League settings:** season label, max teams (2–12), salary cap
- [ ] **Trade rules:** free trades per H2H round, max banked, playoff trade allowance
- [ ] **Squad structure:** edit slot counts via `squad_structure_config`
- [x] **Schedule:** reset / regenerate H2H round-robin
- [ ] **Locks:** view and override lock times per franchise / fixture
- [x] **Scoring (testing):** submit mock fixture scores; recalculate H2H matchup results
- [ ] **Players:** adjust prices (individual or bulk); activate/deactivate pool entries
- [ ] **Audit:** view all teams, squads, transfers, and trade logs

Depends on Phase 6 (transfer engine) and Phase 9 (live data sync hooks).

## Phase 12 — UI polish (`feature/12-ui-pages`)

- Free Agents (filters, sort, lock countdown, overseas badge)
- My Team (squad, C/VC, points)
- Trade history
- Player stats / history

## Phase 13 — Player pool insights (`feature/13-player-pool-stats`)

Tournament-aware player cards in the squad builder / free-agent pool:

- [ ] Season-to-date stats per player (runs, wickets, fantasy pts, matches played)
- [ ] Form badge: **In form** / **Average** / **Out of form** (derived from recent scores vs season baseline)
- [ ] Sort pool by form, price, role, franchise
- [ ] Data from score sync (depends on Phase 8 scoring + Phase 9 live data)
- [ ] Show on `/squad` player pool rows and future Free Agents page
- [ ] Ensure full squad including bench is picked within the salary cap
- [ ] Save option when changing players in squad

---

## Out of scope (v1)

- Mobile native app
- Multi-league public signup (single private league first)
- Overseas player limits (explicitly none per spec)
- Real-money gaming
