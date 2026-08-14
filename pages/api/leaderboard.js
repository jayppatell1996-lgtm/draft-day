import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Fetch available week_starts for dropdown
    const { data: weekStartsRaw, error: weekError } = await supabase
      .from('weekly_leaderboard')
      .select('week_start')
      .order('week_start', { ascending: false });
    if (weekError) throw weekError;
    const weekOptions = Array.from(new Set((weekStartsRaw || []).map(r => r.week_start)));

    // Fetch available dates for daily leaderboard dropdown (safe)
    let dateOptions = [];
    try {
      const { data: datesRaw, error: dateError } = await supabase
        .from('daily_leaderboard')
        .select('date')
        .order('date', { ascending: false });
      if (!dateError && datesRaw) {
        dateOptions = Array.from(new Set(datesRaw.map(r => r.date)));
      } else if (dateError) {
        console.error('Error fetching daily leaderboard dates:', dateError.message);
      }
    } catch (e) {
      console.error('Exception fetching daily leaderboard dates:', e.message);
    }

    // Fetch league leaderboard
    const { data: leagueRows, error: leagueError } = await supabase
      .from('league_leaderboard')
      .select('rank, user_name, total_score')
      .order('total_score', { ascending: false });
    if (leagueError) throw leagueError;

    // Fetch weekly leaderboard for a given week_start
    const { week_start } = req.query;
    let weeklyRows = [];
    if (week_start) {
      const { data: weekly, error: weeklyError } = await supabase
        .from('weekly_leaderboard')
        .select('rank, user_name, weekly_score')
        .eq('week_start', week_start)
        .order('weekly_score', { ascending: false });
      if (weeklyError) throw weeklyError;
      weeklyRows = weekly;
    }

    // Fetch daily leaderboard for a given date (safe)
    const { date } = req.query;
    let dailyRows = [];
    if (date) {
      try {
        const { data: daily, error: dailyError } = await supabase
          .from('daily_leaderboard')
          .select('rank, user_name, daily_score')
          .eq('date', date)
          .order('daily_score', { ascending: false });
        if (!dailyError && daily) {
          dailyRows = daily;
        } else if (dailyError) {
          console.error('Error fetching daily leaderboard rows:', dailyError.message);
        }
      } catch (e) {
        console.error('Exception fetching daily leaderboard rows:', e.message);
      }
    }

    res.status(200).json({
      weekOptions,
      dateOptions,
      league: leagueRows ?? [],
      weekly: weeklyRows ?? [],
      daily: dailyRows ?? [],
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({ message: error.message });
  }
}