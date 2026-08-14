// pages/api/squad.js
import { createServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  try {
    // Get team_id and season_id from query parameters
    const { team_id, season_id } = req.query;
    if (!team_id || !season_id) {
      return res.status(400).json({ error: "Missing team_id or season_id in query" });
    }

    // Retrieve your SportMonks API token from the environment (server-side only)
    const apiToken = process.env.SPORTMONKS_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: "API token is not defined in environment variables" });
    }

    const supabase = createServerSupabaseClient();
    // Try cache lookup
    const { data: cacheEntry, error: cacheErr } = await supabase
      .from('squad_cache')
      .select('squad, fetched_at')
      .eq('team_id', parseInt(team_id))
      .eq('season_id', parseInt(season_id))
      .maybeSingle();
    if (cacheErr) throw cacheErr;
    if (cacheEntry) {
      const age = new Date() - new Date(cacheEntry.fetched_at);
      if (age < 1000 * 60 * 60 * 24) {
        console.log(`Using cached squad for team ${team_id}, season ${season_id}`);
        return res.status(200).json(cacheEntry.squad);
      }
    }
    console.log(`Fetching fresh squad for team ${team_id}, season ${season_id}`);

    // Construct the SportMonks API URL for the squad endpoint
    const apiUrl = `https://cricket.sportmonks.com/api/v2.0/teams/${team_id}/squad/${season_id}?api_token=${apiToken}`;

    // Fetch the squad data from SportMonks
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: "Error fetching squad data", details: errorText });
    }
    
    const data = await response.json();
    // console.log(JSON.stringify(data, null, 2));

    // Upsert fresh squad into cache
    await supabase
      .from('squad_cache')
      .upsert(
        { team_id: parseInt(team_id), season_id: parseInt(season_id), squad: data, fetched_at: new Date() },
        { onConflict: ['team_id', 'season_id'] }
      );

    // Return the JSON data to the client
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
