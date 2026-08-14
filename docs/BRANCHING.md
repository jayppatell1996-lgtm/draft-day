# Git Branching Strategy

## Branches

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Stable, merge-ready code only | Active |
| `feature/01-foundation` | Project docs, env template, naming, upstream wiring | Done (merged) |
| `feature/02-auth-nextauth` | Email login, bcrypt, team name signup, admin flag | Done (pending merge) |
| `feature/03-database-schema` | League, teams, squads, rounds, config tables | **Next** |
| `feature/04-salary-cap-squad` | 120-credit cap, 12+4 squad builder, role slots | Planned |
| `feature/05-league-h2h` | 12-team H2H, round-robin fixtures, standings | Planned |
| `feature/06-transfers-locks` | Lock-to-lock transfers, trade banking, trade log | Planned |
| `feature/07-auto-sub` | Bench auto-sub when playing XI don't feature | Planned |
| `feature/08-scoring-engine` | CPL scoring rules, captain 2× / VC 1× | Planned |
| `feature/09-live-score-sync` | CricAPI match data, lock times, score sync jobs | Planned |
| `feature/10-playoffs` | IPL-style Q1 / Eliminator / Q2 / Final bracket | Planned |
| `feature/11-admin-panel` | Configurable squad rules, manual sync triggers | Planned |
| `feature/12-ui-pages` | Free agents, My Team, matchups, trade history | Planned |

## Workflow

1. **One feature branch at a time** — implement and test on the branch before merging to `main`.
2. **Branch from latest `main`** — before starting a new feature:
   ```bash
   git checkout main
   git pull
   git checkout -b feature/XX-name
   ```
3. **Small commits** — logical units with clear messages (`feat(auth): add bcrypt password hashing`).
4. **Merge via PR or local merge** — after the feature is tested:
   ```bash
   git checkout main
   git merge --no-ff feature/XX-name
   ```
5. **Tag milestones** — optional tags after each merge (`v0.1-foundation`, `v0.2-auth`, …).

## Commit message prefix

| Prefix | Use |
|--------|-----|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change, no behavior change |
| `docs` | Documentation only |
| `chore` | Tooling, deps, config |
| `test` | Tests |

## What not to do

- Do not commit `.env.local` or API keys.
- Do not force-push `main`.
- Do not work on multiple feature branches in parallel until `main` has the dependency merged.

## Dependency order

```
01-foundation
  └─► 02-auth-nextauth
        └─► 03-database-schema
              ├─► 04-salary-cap-squad
              ├─► 05-league-h2h
              └─► 06-transfers-locks
                    ├─► 07-auto-sub
                    ├─► 08-scoring-engine
                    └─► 09-live-score-sync
                          ├─► 10-playoffs
                          ├─► 11-admin-panel
                          └─► 12-ui-pages
```

`08-scoring-engine` and `09-live-score-sync` can be developed in parallel after `03` if needed, but both should land before playoffs go live.
