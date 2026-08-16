-- Phase 6: transfer window banking tracker on squads
ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS last_settled_round_number INT NOT NULL DEFAULT 0;
