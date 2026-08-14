// pages/api/fixtures.js
import { createServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  try {
    // Try cache lookup
    const supabase = createServerSupabaseClient();
    const { data: cacheEntries, error: cacheErr } = await supabase
      .from('fixture_cache')
      .select('fixtures, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1);
    if (cacheErr) throw cacheErr;
    if (cacheEntries?.length > 0) {
      const cached = cacheEntries[0];
      const age = new Date() - new Date(cached.fetched_at);
      if (age < 100 * 60 * 60) {
        console.log(`Using cached fixtures, age ${age}ms`);
        return res.status(200).json(cached.fixtures);
      }
    }

    // Calculate date range dynamically
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    const formatDate = (date) => date.toISOString().slice(0, 10);
    const startsBetween = `${formatDate(yesterday)},${formatDate(dayAfterTomorrow)}`;
    
    // Get API token from environment variables
    const apiToken = process.env.SPORTMONKS_API_TOKEN; 

    if (!apiToken) {
      res.status(500).json({ error: "API configuration error" });
      return;
    }

    // Fetch fresh fixtures
    console.log('Fetching fresh fixtures');
    const baseUrl = 'https://cricket.sportmonks.com/api/v2.0/fixtures';
    const params = new URLSearchParams({
      'api_token': apiToken,
      'filter[league_id]': '1',  // IPL (Indian Premier League)
      'filter[starts_between]': startsBetween,
      'include': 'localteam,visitorteam'
    });
    
    const apiUrl = `${baseUrl}?${params.toString()}`;
    
    // Fetch data from SportMonks
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.data) {
      throw new Error('Invalid API response format');
    }
    
    // Insert fresh fixtures into cache
    await supabase
      .from('fixture_cache')
      .insert({ fixtures: data, fetched_at: new Date() });

    // Return the data to the client
    res.status(200).json(data);
    
  } catch (err) {
    res.status(500).json({ 
      error: "Failed to fetch fixtures",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}