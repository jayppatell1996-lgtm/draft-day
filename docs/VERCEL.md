# Deploy Draft Day on Vercel (free tier)

Use this to share a live URL with friends for testing. Vercel’s hobby plan is free for personal projects.

## Prerequisites

- GitHub repo with this project pushed (`origin` remote)
- [Supabase](https://supabase.com) project (Postgres + you already use `DATABASE_URL`)
- Sportmonks token (optional for fixtures; squad/H2H work without it)

## 1. Push to GitHub

If you don’t have a remote yet:

```powershell
# Create an empty repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USER/draft-day.git
git push -u origin main
git push origin --tags
```

## 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Add **Environment Variables** (Production + Preview):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase Postgres URI — **use Session pooler on Vercel** (not direct `db.*.supabase.co`) |
| `NEXTAUTH_SECRET` | Same as local (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://YOUR-PROJECT.vercel.app` (set after first deploy, then redeploy) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `SPORTMONKS_API_TOKEN` | Optional — fixtures on `/matches` |

5. Deploy

## 3. Fix NextAuth URL after first deploy

1. Copy your Vercel URL (e.g. `https://draft-day-xyz.vercel.app`)
2. Vercel → Project → Settings → Environment Variables
3. Set `NEXTAUTH_URL` to that URL (include `https://`, no trailing slash)
4. Redeploy (Deployments → … → Redeploy)

## 4. Database

Your Supabase DB is shared between local and Vercel — no separate DB needed. Ensure migrations are applied locally first:

```powershell
node --env-file=.env.local scripts/migrate-league-schema.js
node --env-file=.env.local scripts/migrate-transfer-window.js
node --env-file=.env.local scripts/seed-players.js
```

Optional — rename default league display name:

```sql
UPDATE leagues SET name = 'Draft Day' WHERE id = '00000000-0000-4000-8000-000000000001';
```

## 5. Share with friends

Send them:

- Vercel URL
- First signup becomes **admin** (can generate H2H schedule on `/standings`)

## CLI deploy (alternative)

```powershell
npx vercel login
npx vercel link
npx vercel env pull .env.vercel.local
# Add env vars in Vercel dashboard, then:
npx vercel --prod
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login loops / 401 | `NEXTAUTH_URL` must match live URL exactly |
| DB errors | Check `DATABASE_URL` and Supabase IP allowlist (allow all for Vercel) |
| Empty player pool | Run `seed-players.js` against the same DB |
| Build fails | Run `npm run build` locally first |
