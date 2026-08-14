# Product Roadmap

Season-long **salary-cap head-to-head** fantasy cricket league (CricBattle-style), self-hosted as a website.

**Test tournaments:** CPL 2026, The Hundred, bilateral T20s — before full IPL season.

---

## Phase 1 — Foundation (`feature/01-foundation`)

- [x] Fork base from sanaro99/fantasy-cricket
- [x] Git repo + branch strategy
- [ ] `.env.example`, local dev verified (`npm install && npm run dev`)
- [ ] Rename package to `cric-fantasy-league` (display name TBD)

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
- [ ] Run seed locally and verify squad builder

## Phase 5 — League format (`feature/05-league-h2h`)

- 12 fantasy teams
- 11-round round-robin (66 fixtures auto-generated)
- W/D/L points: 2 / 1 / 0
- Standings + head-to-head matchup page per round
- No-result matches excluded from scoring

## Phase 6 — Transfers & locks (`feature/06-transfers-locks`)

- 1 free trade per match, max 10 banked
- 56 trades group stage, 8 playoffs (0 free)
- Lock-to-lock between deadlines
- Lock enforced on both sides of a transfer
- Team hidden until match starts
- Advance squad submission
- Full trade log per team per round

## Phase 7 — Auto-sub (`feature/07-auto-sub`)

- If playing player doesn't feature → highest-scoring bench player who played fills in
- Applied per match at round score calculation
- Port logic from wwc-draft `effective-lineup` pattern

## Phase 8 — Scoring (`feature/08-scoring-engine`)

CPL rules from spec PDF:

- MoM +50
- Batting: runs, boundaries, sixes, milestones, SR bonus (min 20 runs)
- Bowling: wickets, maidens, hauls, economy tiers
- Fielding: catches, stumpings, run outs (no substitute fielder dismissals)
- Super Over excluded

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

## Phase 11 — Admin (`feature/11-admin-panel`)

- Edit squad structure requirements
- Trigger score syncs
- Manage rounds / tournament config
- Player price adjustments (performance-based)

## Phase 12 — UI polish (`feature/12-ui-pages`)

- Free Agents (filters, sort, lock countdown, overseas badge)
- My Team (squad, C/VC, points)
- Trade history
- Player stats / history

---

## Out of scope (v1)

- Mobile native app
- Multi-league public signup (single private league first)
- Overseas player limits (explicitly none per spec)
- Real-money gaming
