-- Phase 11: admin-editable trade rules (JSON on leagues)
-- Run: node --env-file=.env.local scripts/migrate-trade-rules.js

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS trade_rules JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Remove hard cap of 10 on banked free trades (admin sets max via trade_rules)
ALTER TABLE squads DROP CONSTRAINT IF EXISTS squads_free_trades_banked_check;
ALTER TABLE squads
  ADD CONSTRAINT squads_free_trades_banked_check CHECK (free_trades_banked >= 0);
