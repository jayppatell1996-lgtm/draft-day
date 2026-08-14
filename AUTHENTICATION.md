# Authentication & Account Management

This document explains how authentication and account management are handled in the Fantasy Cricket app.

---

## Sign Up
- Users register with **email, password, and full name**.
- The `full_name` is stored in Supabase Auth as user metadata.
- **Do not** manually insert into the `users` table after signup.

## User Profile Creation
- A **Supabase trigger** automatically creates a row in the `users` table after signup.
- The trigger extracts `full_name` from the metadata and stores it in the profile.

### Example Trigger
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

---

## Log Out & Delete Account
- The **Navbar** provides a modal popup with options to log out or delete the account.
- **Delete Account** removes the user from `auth.users` and triggers a cascade delete of all related data.

### Cascade Delete Trigger
```sql
create or replace function public.handle_user_delete()
returns trigger as $$
begin
  delete from public.weekly_leaderboard where user_id = old.id;
  delete from public.league_leaderboard where user_id = old.id;
  delete from public.player_selections where user_id = old.id;
  delete from public.users where id = old.id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
after delete on auth.users
for each row execute procedure public.handle_user_delete();
```

---

## Security Notes
- **Service Role Key** is only used server-side (never exposed to the browser).
- All sensitive actions (like account deletion) are handled via Next.js API routes.

---

For additional details, see the main `README.md` or contact the maintainers.
