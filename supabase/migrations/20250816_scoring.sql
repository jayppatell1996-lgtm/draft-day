-- Phase 7/8: player match scores and round ↔ fixture linkage
-- Run: node --env-file=.env.local scripts/migrate-scoring.js

CREATE TABLE IF NOT EXISTS player_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  featured_in_xi BOOLEAN NOT NULL DEFAULT FALSE,
  is_man_of_match BOOLEAN NOT NULL DEFAULT FALSE,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_points NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT player_match_scores_fixture_player_unique UNIQUE (fixture_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_match_scores_fixture
  ON player_match_scores (fixture_id);

CREATE INDEX IF NOT EXISTS idx_player_match_scores_player
  ON player_match_scores (player_id);

CREATE TABLE IF NOT EXISTS round_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT round_fixtures_round_fixture_unique UNIQUE (round_id, fixture_id)
);

CREATE INDEX IF NOT EXISTS idx_round_fixtures_round
  ON round_fixtures (round_id);

CREATE INDEX IF NOT EXISTS idx_round_fixtures_fixture
  ON round_fixtures (fixture_id);
