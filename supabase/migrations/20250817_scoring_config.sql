-- Admin-editable scoring rules (JSON on leagues)
-- Run: node --env-file=.env.local scripts/migrate-scoring-config.js

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS scoring_config JSONB NOT NULL DEFAULT '{}'::jsonb;
