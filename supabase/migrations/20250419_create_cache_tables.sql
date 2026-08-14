-- SQL migration to create cache tables for Sportmonks API responses

-- CREATE TABLE IF NOT EXISTS fixture_cache (
--   fixtures JSONB NOT NULL,
--   fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS squad_cache (
--   team_id INT NOT NULL,
--   season_id INT NOT NULL,
--   squad JSONB NOT NULL,
--   fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
--   PRIMARY KEY (team_id, season_id)
-- );
