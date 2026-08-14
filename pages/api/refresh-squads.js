import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  try {
    const apiToken = process.env.SPORTMONKS_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: "API configuration error" });
    }

    // Retrieve all cached team/season entries
    const { data: entries, error: fetchErr } = await supabase
      .from('squad_cache')
      .select('team_id, season_id');
    if (fetchErr) throw fetchErr;

    const results = [];
    for (const entry of entries || []) {
      const { team_id: teamId, season_id: seasonId } = entry;
      const apiUrl = `https://cricket.sportmonks.com/api/v2.0/teams/${teamId}/squad/${seasonId}?api_token=${apiToken}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        results.push({ team_id: teamId, season_id: seasonId, status: response.status });
        continue;
      }
      const data = await response.json();
      // Upsert fresh squad into cache
      await supabase
        .from('squad_cache')
        .upsert(
          { team_id: teamId, season_id: seasonId, squad: data, fetched_at: new Date() },
          { onConflict: ['team_id', 'season_id'] }
        );
      results.push({ team_id: teamId, season_id: seasonId, status: 'updated' });
    }

    return res.status(200).json({ refreshed: results });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to refresh squads', details: err.message });
  }
}
