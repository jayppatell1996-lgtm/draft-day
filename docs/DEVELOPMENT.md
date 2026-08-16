# Local Development

## Prerequisites

- **Node.js** 18+ (LTS recommended) — `C:\Program Files\nodejs`
- **Git** 2.40+ — `C:\Program Files\Git\cmd`
- **Supabase** project (free tier is fine for dev)
- **Sportmonks** API token (upstream base; CricAPI planned later)

**Terminal note:** If `git` or `npm` is not found, open a **new** terminal tab (workspace `.vscode/settings.json` prepends Git/Node to PATH). After installing Git/Node, restart Cursor once if a new tab still fails.

## Setup

```powershell
cd "c:\Users\PC\Documents\Cricket Fantasy App"
git checkout feature/01-foundation   # or main after merge
cp .env.example .env.local           # fill in values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Auth database migration

Before first signup, run `supabase/migrations/20250814_nextauth_users_teams.sql` in the Supabase SQL editor (or via Supabase CLI).

After auth is working, apply the league schema:

```powershell
node --env-file=.env.local scripts/migrate-league-schema.js
```

See [DATABASE.md](./DATABASE.md) for full migration order and table reference.

Seed the player pool (required before squad builder):

```powershell
node --env-file=.env.local scripts/seed-players.js
```

When at least 2 fantasy teams are registered (up to 12), generate the H2H round-robin schedule:

```powershell
node --env-file=.env.local scripts/init-h2h-schedule.js
```

Or use **Generate schedule** on `/standings` (admin only).

Generate a NextAuth secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Verify base app (feature/01-foundation checklist)

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts on port 3000
- [ ] Login page loads
- [ ] Supabase env vars configured (see README)
- [ ] Matches page loads fixtures (requires Sportmonks token)

## Branch workflow

See [BRANCHING.md](./BRANCHING.md). Current active branch should be the feature in progress.

**Cursor agents:** Project context lives in `.cursor/skills/cric-fantasy-league/SKILL.md` — read it at the start of new chats.

```powershell
git branch                    # list branches
git checkout feature/02-auth-nextauth   # start next feature after 01 merges
```

## Remotes

| Remote | URL | Purpose |
|--------|-----|---------|
| `upstream` | sanaro99/fantasy-cricket | Original base for occasional merges |
| `origin` | *(add your GitHub repo)* | Your hosted copy |

```powershell
git remote add origin https://github.com/YOUR_USER/cric-fantasy-league.git
git push -u origin main
git push origin --tags
```
