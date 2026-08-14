# Local Development

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Git** 2.40+
- **Supabase** project (free tier is fine for dev)
- **Sportmonks** API token (upstream base; CricAPI planned later)

## Setup

```powershell
cd "c:\Users\PC\Documents\Cricket Fantasy App"
git checkout feature/01-foundation   # or main after merge
cp .env.example .env.local           # fill in values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify base app (feature/01-foundation checklist)

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts on port 3000
- [ ] Login page loads
- [ ] Supabase env vars configured (see README)
- [ ] Matches page loads fixtures (requires Sportmonks token)

## Branch workflow

See [BRANCHING.md](./BRANCHING.md). Current active branch should be the feature in progress.

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
