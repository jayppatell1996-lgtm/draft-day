-- Cache tables for Sportmonks API responses (fixtures + squads)

CREATE TABLE IF NOT EXISTS fixture_cache (
  id BIGSERIAL PRIMARY KEY,
  fixtures JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_cache (
  team_id INT NOT NULL,
  season_id INT NOT NULL,
  squad JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, season_id)
);
