-- Phase 3: core league schema (salary-cap H2H fantasy cricket)
-- Depends on: 20250814_nextauth_users_teams.sql (fantasy_teams, league_users)
-- Run: node --env-file=.env.local scripts/migrate-league-schema.js

-- ---------------------------------------------------------------------------
-- Leagues (v1: single private league; table supports future multi-league)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  season_label VARCHAR(50) NOT NULL,
  salary_cap NUMERIC(6, 2) NOT NULL DEFAULT 120 CHECK (salary_cap > 0),
  max_teams INT NOT NULL DEFAULT 12 CHECK (max_teams >= 2),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO leagues (id, name, season_label, status)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Cric Fantasy League',
  'CPL 2026',
  'draft'
)
ON CONFLICT (id) DO NOTHING;

-- Link existing fantasy teams to the default league
ALTER TABLE fantasy_teams
  ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE RESTRICT;

UPDATE fantasy_teams
SET league_id = '00000000-0000-4000-8000-000000000001'
WHERE league_id IS NULL;

ALTER TABLE fantasy_teams
  ALTER COLUMN league_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fantasy_teams_league_id ON fantasy_teams (league_id);

-- ---------------------------------------------------------------------------
-- Players & variable pricing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  external_id BIGINT NOT NULL,
  full_name TEXT NOT NULL,
  short_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('WK', 'BAT', 'BOWL', 'AR')),
  franchise_external_id BIGINT,
  franchise_name TEXT,
  is_overseas BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT players_league_external_unique UNIQUE (league_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_players_league_role ON players (league_id, role);
CREATE INDEX IF NOT EXISTS idx_players_league_franchise ON players (league_id, franchise_external_id);

CREATE TABLE IF NOT EXISTS player_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  price NUMERIC(6, 2) NOT NULL CHECK (price > 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT player_prices_effective_range CHECK (
    effective_to IS NULL OR effective_to > effective_from
  )
);

CREATE INDEX IF NOT EXISTS idx_player_prices_current
  ON player_prices (league_id, player_id, effective_from DESC)
  WHERE effective_to IS NULL;

-- ---------------------------------------------------------------------------
-- Squads (16 slots: 12 playing + 4 bench)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  captain_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  vice_captain_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  budget_remaining NUMERIC(6, 2) NOT NULL DEFAULT 120,
  free_trades_banked INT NOT NULL DEFAULT 0
    CHECK (free_trades_banked >= 0 AND free_trades_banked <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT squads_league_team_unique UNIQUE (league_id, fantasy_team_id)
);

CREATE INDEX IF NOT EXISTS idx_squads_fantasy_team ON squads (fantasy_team_id);

CREATE TABLE IF NOT EXISTS squad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('WK', 'BAT', 'BOWL', 'FLEX', 'BENCH')),
  slot_index INT NOT NULL CHECK (slot_index >= 0),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  is_playing BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT squad_slots_unique_position UNIQUE (squad_id, slot_type, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_squad_slots_player ON squad_slots (player_id);

-- Admin-editable squad structure (defaults: 1 WK, 5 BAT, 5 BOWL, 1 FLEX, 4 bench)
CREATE TABLE IF NOT EXISTS squad_structure_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('WK', 'BAT', 'BOWL', 'FLEX', 'BENCH')),
  required_count INT NOT NULL CHECK (required_count >= 0),
  is_playing BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT squad_structure_config_unique UNIQUE (league_id, slot_type, is_playing)
);

INSERT INTO squad_structure_config (league_id, slot_type, required_count, is_playing)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'WK', 1, TRUE),
  ('00000000-0000-4000-8000-000000000001', 'BAT', 5, TRUE),
  ('00000000-0000-4000-8000-000000000001', 'BOWL', 5, TRUE),
  ('00000000-0000-4000-8000-000000000001', 'FLEX', 1, TRUE),
  ('00000000-0000-4000-8000-000000000001', 'BENCH', 4, FALSE)
ON CONFLICT (league_id, slot_type, is_playing) DO NOTHING;

-- ---------------------------------------------------------------------------
-- League rounds & fantasy H2H matchups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number >= 1),
  name TEXT,
  is_playoff BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rounds_league_number_unique UNIQUE (league_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_league ON rounds (league_id, round_number);

CREATE TABLE IF NOT EXISTS h2h_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  home_points NUMERIC(8, 2),
  away_points NUMERIC(8, 2),
  result TEXT CHECK (result IN ('home_win', 'away_win', 'draw', 'no_result')),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT h2h_matchups_distinct_teams CHECK (home_team_id <> away_team_id),
  CONSTRAINT h2h_matchups_round_pair_unique UNIQUE (round_id, home_team_id, away_team_id)
);

CREATE INDEX IF NOT EXISTS idx_h2h_matchups_round ON h2h_matchups (round_id);
CREATE INDEX IF NOT EXISTS idx_h2h_matchups_home ON h2h_matchups (home_team_id);
CREATE INDEX IF NOT EXISTS idx_h2h_matchups_away ON h2h_matchups (away_team_id);

-- ---------------------------------------------------------------------------
-- Real cricket fixtures (synced from Sportmonks/CricAPI) & franchise lock times
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  external_fixture_id BIGINT NOT NULL,
  season_id BIGINT,
  local_team_external_id BIGINT,
  local_team_name TEXT NOT NULL,
  visitor_team_external_id BIGINT,
  visitor_team_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  round_label TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fixtures_league_external_unique UNIQUE (league_id, external_fixture_id)
);

CREATE INDEX IF NOT EXISTS idx_fixtures_league_starts ON fixtures (league_id, starts_at);

CREATE TABLE IF NOT EXISTS lock_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  franchise_external_id BIGINT,
  franchise_name TEXT NOT NULL,
  locks_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lock_times_fixture_franchise_unique UNIQUE (fixture_id, franchise_external_id)
);

CREATE INDEX IF NOT EXISTS idx_lock_times_league_locks ON lock_times (league_id, locks_at);
CREATE INDEX IF NOT EXISTS idx_lock_times_franchise ON lock_times (franchise_external_id, locks_at);

-- ---------------------------------------------------------------------------
-- Transfers & audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  round_id UUID REFERENCES rounds(id) ON DELETE SET NULL,
  player_in_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_out_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  price_in NUMERIC(6, 2) NOT NULL CHECK (price_in > 0),
  price_out NUMERIC(6, 2) NOT NULL CHECK (price_out > 0),
  cost_delta NUMERIC(6, 2) NOT NULL,
  used_free_trade BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transfers_distinct_players CHECK (player_in_id <> player_out_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_squad_created ON transfers (squad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_round ON transfers (round_id);

CREATE TABLE IF NOT EXISTS trade_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  round_id UUID REFERENCES rounds(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_log_team_created ON trade_log (fantasy_team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_log_squad_created ON trade_log (squad_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Note: league_users (auth) and fantasy_teams already exist from Phase 2.
-- Upstream player_selections remains until Phase 04+ replaces per-match picks.
-- ---------------------------------------------------------------------------
