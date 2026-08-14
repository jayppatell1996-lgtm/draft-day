-- NextAuth credentials auth: fantasy teams + league users
-- Run against your Supabase/Postgres database (see docs/DEVELOPMENT.md)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS fantasy_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fantasy_teams_name_length CHECK (char_length(trim(name)) >= 2 AND char_length(trim(name)) <= 30),
  CONSTRAINT fantasy_teams_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS league_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT league_users_email_unique UNIQUE (lower(email))
);

CREATE INDEX IF NOT EXISTS idx_league_users_email_lower ON league_users (lower(email));
