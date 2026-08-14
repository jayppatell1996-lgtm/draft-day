import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  try {
    const apiToken = process.env.SPORTMONKS_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: "API configuration error" });
    }

    // Calculate date range dynamically
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    const formatDate = (date) => date.toISOString().slice(0, 10);
    const startsBetween = `${formatDate(yesterday)},${formatDate(dayAfterTomorrow)}`;

    const baseUrl = 'https://cricket.sportmonks.com/api/v2.0/fixtures';
    const params = new URLSearchParams({
      'api_token': apiToken,
      'filter[league_id]': '1',  // IPL (Indian Premier League)
      'filter[starts_between]': startsBetween,
      'include': 'localteam,visitorteam'
    });
    const apiUrl = `${baseUrl}?${params.toString()}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json();

    // Insert fresh fixtures into cache
    await supabase
      .from('fixture_cache')
      .insert({ fixtures: data, fetched_at: new Date() });

    return res.status(200).json({ refreshed: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to refresh fixtures', details: err.message });
  }
}
