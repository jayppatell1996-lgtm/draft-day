# Product Reference — Cric Fantasy League

Canonical rules for implementation. If code disagrees with this file, fix the code unless the user changes the spec.

## League & format

- 12 fantasy teams, head-to-head
- Group stage: 11-round round-robin (each team plays every other once) → **66 fixtures** auto-generated
- Standings points: Win **2**, Draw **1**, Loss **0**
- Top **6** advance to IPL-style playoffs:
  1. Qualifier 1 (#1 vs #2)
  2. Eliminator (#3 vs #4)
  3. Qualifier 2 (Q1 loser vs Eliminator winner)
  4. Final
- No-result matches **excluded** from scoring

## Authentication

- Email + password signup and login
- Team name at signup: **2–30 chars**, uniqueness enforced
- Password: **bcrypt**, cost **12**
- Session carries: `teamId`, `teamName`, `isAdmin`
- First registered user → **admin**
- Unauthenticated users → redirect to login

## Salary cap & budget

- **120 credits** per team
- Variable player prices (rise/fall with performance)
- Budget deducted/refunded on every swap
- Remaining budget tracked in DB and returned after each transfer

## Squad structure

- **16 players:** 12 playing + 4 bench
- Playing 12: **1 WK, 5 BAT, 5 BOWL, 1 FLEX** (any role)
- All-rounders may fill BAT or BOWL slots
- **No** overseas player restriction
- Captain **2×**, Vice-captain **1×**
- Admin can edit squad structure requirements (slot counts)

## Auto-substitution

- If a **playing** squad member does not feature in the real match XI → highest-scoring **bench** player who **did play** auto-fills
- Applied **per match** when calculating round scores

## Player locks

- Lock per IPL franchise at that team's **match start time**
- Double-headers: each pair locks independently
- Lock enforced on **both sides** of a transfer (player in and out)
- Lock times from CricAPI, stored in DB
- UI: show lock time on free-agent cards (Mountain Time); grey out locked players

## Transfers

- **1 free trade per match**, up to **10 banked** (carry-forward)
- **56** total trades group stage; **8** playoffs (**0** free)
- Lock-to-lock system (changes between deadlines count)
- Opponent squad hidden until match starts
- Advance squad submission supported
- Full trade log per team per round

## Scoring (CPL rules)

- Man of the Match: **+50**
- **Batting:** 1 pt/run; +1 boundary; +2 six; milestones 50/100/125 (non-cumulative); SR bonus tiers 120–160+ (min **20 runs** to qualify); no SR penalty
- **Bowling:** 25/wicket; 25/maiden; +25 for 3-wkt haul; +50 for 5-wkt haul; economy bonus table (8 tiers, 0–3.99 = +30 down to 10+ = −10)
- **Fielding:** catch +12; stumping +15; direct run out +20; indirect run out +20
- Exclude: substitute fielder dismissals, Super Over

## UI pages (v1)

- Squad builder (12 + 4 from scratch)
- My Team (squad, points, C/VC)
- Standings / leaderboard
- Head-to-head matchup per round
- Admin panel (score sync triggers, rounds)
- Playoff bracket
- Player history / stats
- Trade history log
- Free Agents (search, IPL team pills, role filter, sort by price/name, overseas badge, exclude owned)

## Test tournaments

Use shorter series before full IPL: **CPL**, The Hundred, bilateral T20s.

## Reference implementations (patterns only)

| Repo | Borrow |
|------|--------|
| nishantsingodia/wwc-draft | Auto-sub / effective lineup |
| nishantsingodia/wwc-points-bot | Live scoring pipeline |
| open-fantasy-league/fantasy-esport-scala | Salary cap + transfer windows API design |
