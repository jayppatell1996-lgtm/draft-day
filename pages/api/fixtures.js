// pages/api/fixtures.js
import { createServerSupabaseClient } from '../../lib/supabaseClient';

async function readFixtureCache() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: cacheEntries, error: cacheErr } = await supabase
      .from('fixture_cache')
      .select('fixtures, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1);

    if (cacheErr) {
      console.warn('Fixture cache read failed:', cacheErr.message);
      return null;
    }

    if (cacheEntries?.length > 0) {
      const cached = cacheEntries[0];
      const age = new Date() - new Date(cached.fetched_at);
      if (age < 100 * 60 * 60) {
        console.log(`Using cached fixtures, age ${age}ms`);
        return cached.fixtures;
      }
    }
  } catch (err) {
    console.warn('Fixture cache unavailable:', err.message);
  }

  return null;
}

async function writeFixtureCache(data) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('fixture_cache')
      .insert({ fixtures: data, fetched_at: new Date() });

    if (error) {
      console.warn('Fixture cache write failed:', error.message);
    }
  } catch (err) {
    console.warn('Fixture cache write unavailable:', err.message);
  }
}

export default async function handler(req, res) {
  try {
    const apiToken = process.env.SPORTMONKS_API_TOKEN;
    if (!apiToken) {
      return res.status(503).json({
        error: 'Fixtures unavailable',
        details: 'Set SPORTMONKS_API_TOKEN in .env.local (Sportmonks dashboard → API token).',
      });
    }

    const cached = await readFixtureCache();
    if (cached) {
      return res.status(200).json(cached);
    }

    // Calculate date range dynamically
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    const formatDate = (date) => date.toISOString().slice(0, 10);
    const startsBetween = `${formatDate(yesterday)},${formatDate(dayAfterTomorrow)}`;

    // Fetch fresh fixtures
    console.log('Fetching fresh fixtures from Sportmonks');
    const baseUrl = 'https://cricket.sportmonks.com/api/v2.0/fixtures';
    const params = new URLSearchParams({
      api_token: apiToken,
      'filter[league_id]': '1', // IPL (Indian Premier League)
      'filter[starts_between]': startsBetween,
      include: 'localteam,visitorteam',
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Sportmonks API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.data) {
      throw new Error('Invalid Sportmonks API response format');
    }

    await writeFixtureCache(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch fixtures',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}