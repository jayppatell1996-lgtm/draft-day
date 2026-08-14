# Authentication & Account Management

Authentication uses **NextAuth.js** with a **Credentials** provider (email + password). Passwords are hashed with **bcrypt** (cost factor **12**).

---

## Sign up

1. User submits **team name** (2–30 characters, unique), **email**, and **password** (min 8 characters).
2. `POST /api/auth/signup` creates a row in `fantasy_teams` and `league_users`.
3. The **first registered user** is automatically assigned `is_admin = true`.
4. Client signs in via NextAuth credentials and redirects to `/matches`.

## Log in

- `signIn('credentials', { email, password })` via NextAuth.
- Session is JWT-based (30-day max age).

## Session fields

Available on `session.user`:

| Field | Description |
|-------|-------------|
| `id` | User UUID |
| `email` | Normalized email |
| `teamId` | Fantasy team UUID |
| `teamName` | Unique team display name |
| `isAdmin` | Admin flag |

## Protected routes

`components/AuthGate.jsx` wraps all pages except `/login`. Unauthenticated users are redirected to `/login`.

## Log out & delete account

- **Logout:** NextAuth `signOut()` from the Navbar modal.
- **Delete account:** `POST /api/delete-account` (session cookie) deletes `league_users` and the linked `fantasy_teams` row, then signs out.

---

## Database setup

Run the migration against your Postgres database (Supabase SQL editor or CLI):

```
supabase/migrations/20250814_nextauth_users_teams.sql
```

Tables:

- `fantasy_teams` — unique team names
- `league_users` — email, password hash, team link, admin flag

---

## Environment variables

See `.env.example`. Required for auth:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`

Supabase keys remain required for match/fixture APIs until those are migrated.

---

## Legacy Supabase Auth

The upstream Supabase Auth flow (`supabase.auth.signInWithPassword`, OAuth) has been replaced. The old `/api/auth-credentials` route is deprecated.
