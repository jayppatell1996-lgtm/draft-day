-- Phase 10: playoff stage label on rounds
-- Run: node --env-file=.env.local scripts/migrate-playoffs.js

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS playoff_stage TEXT
  CHECK (
    playoff_stage IS NULL OR playoff_stage IN (
      'qualifier1', 'eliminator', 'qualifier2', 'final'
    )
  );

CREATE INDEX IF NOT EXISTS idx_rounds_playoff_stage
  ON rounds (league_id, playoff_stage)
  WHERE playoff_stage IS NOT NULL;
