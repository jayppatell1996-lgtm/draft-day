# Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Web App                         │
│  Pages: Squad Builder │ My Team │ H2H │ Standings │ Admin   │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │      API Routes /       │
              │   Server Actions        │
              └────────────┬────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
     ▼                     ▼                     ▼
┌─────────┐        ┌─────────────┐       ┌──────────────┐
│ NextAuth│        │  PostgreSQL │       │   CricAPI    │
│ sessions│        │  (Supabase) │       │  (fixtures,  │
│         │        │             │       │   scores)    │
└─────────┘        └─────────────┘       └──────────────┘
                           │
                    ┌──────┴──────┐
                    │ Cron / Admin │
                    │  score sync  │
                    └─────────────┘
```

## Key domains

### League engine

- Round-robin fixture generator (12 teams → 66 matches over 11 rounds)
- H2H scoring: compare fantasy team points per real-world match round
- Playoff bracket state machine

### Squad engine

- Slot types: `WK`, `BAT`, `BOWL`, `FLEX`
- `AR` players satisfy `BAT` or `BOWL` constraints
- Playing XI (12) + bench (4) with admin-configurable counts

### Transfer engine

- Lock windows derived from earliest unlocked match in the round
- Net-change billing optional (spec uses per-swap with banking)
- Budget: `remaining = cap - sum(squad prices)`

### Scoring engine

Pure functions: `scorePlayer(inningsStats, role) → points`

- Idempotent per player per match
- Captain multiplier applied after player totals
- Auto-sub runs before scoring: `effectiveLineup(squad, playingXIs) → starters`

## Migration path from upstream

| Upstream | Target |
|----------|--------|
| Supabase Auth | NextAuth + credentials provider |
| Per-match `player_selections` | Season `squads` + `transfers` |
| `lock-selections` API | Per-team lock times from CricAPI |
| Sportmonks fixtures | CricAPI (keep Sportmonks until sync lands) |
| Global leaderboard | H2H standings + fantasy team points |

## Testing strategy

Each feature branch should include:

1. **Unit tests** for pure logic (scoring, auto-sub, fixture gen) where practical
2. **Manual test checklist** in branch PR description
3. **Seed script** for dummy 12-team league against a short tournament (CPL)
