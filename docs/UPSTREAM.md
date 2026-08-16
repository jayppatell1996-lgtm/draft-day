# Upstream Base

This project extends **[sanaro99/fantasy-cricket](https://github.com/sanaro99/fantasy-cricket)** (GPL-3.0).

## Why this base

| Criterion | sanaro99/fantasy-cricket |
|-----------|--------------------------|
| Web hosting | Next.js 15 — deployable to Vercel or any Node host |
| Cricket / IPL | IPL fixtures, squads, player selection, leaderboards |
| Auth | Email + OAuth via Supabase (we will migrate to NextAuth + bcrypt) |
| Data layer | Supabase + migrations folder |
| Locking | Existing selection lock APIs to build on |

## What we keep from upstream

- Next.js app shell, Tailwind styling, page routing
- Match/fixture/squad API patterns and Sportmonks integration (interim)
- Leaderboard and player-selection flows as reference implementations
- Supabase migration workflow

## What we replace or add

See [ROADMAP.md](./ROADMAP.md). Major deltas:

- **Format:** daily pick'em → season-long salary-cap head-to-head league
- **Auth:** Supabase Auth → NextAuth (email/password, bcrypt cost 12)
- **Squad:** 11-player match team → 12 playing + 4 bench with configurable roles
- **League:** global leaderboard → 2–12 team H2H round-robin + IPL playoffs
- **Scoring:** upstream rules → CPL ruleset (see spec)
- **Data:** Sportmonks → CricAPI (planned)

## Reference repos (not forked — patterns only)

| Repo | Use for |
|------|---------|
| [nishantsingodia/wwc-points-bot](https://github.com/nishantsingodia/wwc-points-bot) | Live scoring pipeline, multi-tournament sync |
| [nishantsingodia/wwc-draft](https://github.com/nishantsingodia/wwc-draft) | Auto-substitution + captain cascade logic |
| [open-fantasy-league/fantasy-esport-scala](https://github.com/open-fantasy-league/fantasy-esport-scala) | Salary cap, transfer windows, squad limits API design |

## Syncing upstream

```bash
git remote add upstream https://github.com/sanaro99/fantasy-cricket.git
git fetch upstream
git merge upstream/master   # resolve conflicts on our feature branches as needed
```
