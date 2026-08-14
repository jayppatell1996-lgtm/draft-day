// pages/api/run-leaderboard.js
import { createClient } from '@supabase/supabase-js';

// Use the service role key to bypass RLS and write to all tables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // 1) Compute this week's bounds (UTC Sunday to next Sunday)
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun,1=Mon…
    const lastSun = new Date(now);
    lastSun.setUTCDate(now.getUTCDate() - day);
    lastSun.setUTCHours(0, 0, 0, 0);
    const nextSun = new Date(lastSun);
    nextSun.setUTCDate(lastSun.getUTCDate() + 7);
    const weekStartISO = lastSun.toISOString();
    const weekEndISO = nextSun.toISOString();

    // 2) Fetch this week's selections, filtered by fixture starting_at
    const { data: allSelections = [] } = await supabase
      .from('player_selections')
      .select('user_id,fixture_id,team_a_ids,team_b_ids');

    // Fetch latest fixture cache for starting_at dates
    const { data: cacheEntries = [] } = await supabase
      .from('fixture_cache')
      .select('fixtures')
      .order('fetched_at', { ascending: false })
      .limit(1);
    const fixtureDateMap = {};
    if (cacheEntries.length > 0) {
      const fixturesArr = cacheEntries[0].fixtures.data || cacheEntries[0].fixtures;
      fixturesArr.forEach(f => {
        if (f.id != null && f.starting_at) {
          fixtureDateMap[f.id] = f.starting_at;
        }
      });
    }

    const weeklySel = allSelections.filter(sel => {
      const start = fixtureDateMap[sel.fixture_id];
      return start && start >= weekStartISO && start < weekEndISO;
    });

    // 3) Fetch ALL selections for league
    const { data: leagueSel = [] } = await supabase
      .from('player_selections')
      .select('user_id,fixture_id,team_a_ids,team_b_ids');

    // 4) Distinct fixture IDs
    const fixtureIds = Array.from(
      new Set([
        ...weeklySel.map(r => r.fixture_id),
        ...leagueSel.map(r => r.fixture_id),
      ])
    );

    const apiToken = process.env.SPORTMONKS_API_TOKEN;
    // console.log("apiToken", apiToken);

    // 5) Fetch and map batting data per fixture
    const fixtureBatting = {};
    for (const fid of fixtureIds) {
      try{
      const baseUrl = 'https://cricket.sportmonks.com/api/v2.0/fixtures/'+fid;
      // Fetch batting stats
      const paramsBat = new URLSearchParams({
        'api_token': apiToken,
        'include': 'batting.batsman'
      });
      const apiUrlBat = `${baseUrl}?${paramsBat.toString()}`;
      console.log(apiUrlBat);
      const responseBat = await fetch(apiUrlBat);
      if (!responseBat.ok) {
        console.error(`Failed to fetch fixture batting ${fid}:`, responseBat.statusText);
        fixtureBatting[fid] = {};
        continue;
      }
      const jsonBat = await responseBat.json();

      // Extract the actual batting array
      let battingArr = [];
      if (Array.isArray(jsonBat.data.batting)) {
        battingArr = jsonBat.data.batting;
        // console.log(battingArr);
      } else if (
        jsonBat.data.batting &&
        Array.isArray(jsonBat.data.batting.data)
      ) {
        battingArr = jsonBat.data.batting.data;
        console.log("In if condition...");
      }

      // Map player_id -> total runs and sixes
      const map = {};
      const sixesMap = {};
      for (const b of battingArr) {
        if (b && b.player_id != null) {
          const pid = Number(b.player_id);
          const runs = Number(b.score || 0);
          map[pid] = (map[pid] || 0) + runs;
          const sixes = Number(b.six_x || 0);
          sixesMap[pid] = (sixesMap[pid] || 0) + sixes;
        }
      }
      fixtureBatting[fid] = map;
      fixtureBatting[`${fid}_sixes`] = sixesMap;

      // Fetch bowling stats
      const paramsBowl = new URLSearchParams({
        'api_token': apiToken,
        'include': 'bowling.bowler'
      });
      const apiUrlBowl = `${baseUrl}?${paramsBowl.toString()}`;
      console.log(apiUrlBowl);
      const responseBowl = await fetch(apiUrlBowl);
      let bowlingArr = [];
      if (responseBowl.ok) {
        const jsonBowl = await responseBowl.json();
        if (Array.isArray(jsonBowl.data.bowling)) {
          bowlingArr = jsonBowl.data.bowling;
        } else if (jsonBowl.data.bowling && Array.isArray(jsonBowl.data.bowling.data)) {
          bowlingArr = jsonBowl.data.bowling.data;
        }
      } else {
        console.error(`Failed to fetch fixture bowling ${fid}:`, responseBowl.statusText);
      }
      // Map player_id -> total wickets
      const mapWickets = {};
      for (const b of bowlingArr) {
        if (b && b.player_id != null) {
          const pid = Number(b.player_id);
          const wickets = Number(b.wickets || 0);
          mapWickets[pid] = (mapWickets[pid] || 0) + wickets;
        }
      }
      fixtureBatting[`${fid}_wickets`] = mapWickets;
      } catch (e) {
        console.error(`Error fetching fixture ${fid}:`, e);
        fixtureBatting[fid] = {};
      }
    }

    // Points calculation helpers
    function playerPoints(runs) {
      if (runs >= 100) return 150;
      if (runs >= 50) return 60;
      if (runs >= 30) return 30;
      return 0;
    }
    function calculateSelectionPoints(sel, fixtureBatting) {
      const bats = fixtureBatting[sel.fixture_id] || {};
      const wickets = fixtureBatting[`${sel.fixture_id}_wickets`] || {};
      const sixesMap = fixtureBatting[`${sel.fixture_id}_sixes`] || {};
      let pts = 0;
      const teamA = Array.isArray(sel.team_a_ids) ? sel.team_a_ids : [];
      const teamB = Array.isArray(sel.team_b_ids) ? sel.team_b_ids : [];
      for (const pid of [...teamA, ...teamB]) {
        pts += playerPoints(bats[pid] || 0);
        pts += 30 * (wickets[pid] || 0);
        pts += 5 * (sixesMap[pid] || 0);
      }
      return pts;
    }



    // 6) Aggregate scores
    const weeklyScores = {};
    for (const sel of weeklySel) {
      const pts = calculateSelectionPoints(sel, fixtureBatting);
      weeklyScores[sel.user_id] = (weeklyScores[sel.user_id] || 0) + pts;
    }
    const leagueScores = {};
    for (const sel of leagueSel) {
      const pts = calculateSelectionPoints(sel, fixtureBatting);
      leagueScores[sel.user_id] = (leagueScores[sel.user_id] || 0) + pts;
    }

    // 7) Load user profiles
    const userIds = Array.from(new Set([...Object.keys(weeklyScores), ...Object.keys(leagueScores)]));
    // Fetch user profiles from users table
    const { data: profiles = [], error: profileError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', userIds);
    let users = profiles || [];
    // Fallback: if no profiles found, fetch from auth.users for emails
    if (users.length === 0) {
      const { data: authUsers = [] } = await supabase
        .from('auth.users')
        .select('id, email')
        .in('id', userIds);
      users = authUsers.map(u => ({ id: u.id, full_name: u.email }));
    }

    // 8) Upsert weekly_leaderboard
    const weekStartDate = lastSun.toISOString().slice(0,10);
    const weeklyRows = users.map(u => ({
      week_start:   weekStartDate,
      user_id:      u.id,
      user_name:    u.full_name || u.id,
      weekly_score: weeklyScores[u.id] || 0,
      rank:         null
    }));
    await supabase
      .from('weekly_leaderboard')
      .upsert(weeklyRows, { onConflict: ['week_start','user_id'] });

    // 9) Upsert league_leaderboard
    const leagueRows = users.map(u => ({
      user_id:     u.id,
      user_name:   u.full_name || u.id,
      total_score: leagueScores[u.id] || 0,
      rank:        null
    }));
    await supabase
      .from('league_leaderboard')
      .upsert(leagueRows, { onConflict: ['user_id'] });

    // 10) Upsert daily_leaderboard for each fixture date based on starting_at
    const uniqueDates = Array.from(new Set(
      fixtureIds
        .map(fid => fixtureDateMap[fid]?.slice(0,10))
        .filter(Boolean)
    ));
    let totalDailyRows = [];
    for (const dateStr of uniqueDates) {
      const selForDate = allSelections.filter(
        sel => fixtureDateMap[sel.fixture_id]?.slice(0,10) === dateStr
      );
      const dailyScoresDate = {};
      for (const sel of selForDate) {
        const pts = calculateSelectionPoints(sel, fixtureBatting);
        dailyScoresDate[sel.user_id] = (dailyScoresDate[sel.user_id] || 0) + pts;
      }
      const dailyRowsDate = users.map(u => ({
        date: dateStr,
        user_id: u.id,
        user_name: u.full_name || u.id,
        daily_score: dailyScoresDate[u.id] || 0,
        rank: null
      }));
      totalDailyRows.push(...dailyRowsDate);
      await supabase
        .from('daily_leaderboard')
        .upsert(dailyRowsDate, { onConflict: ['date','user_id'] });
    }

    // 10) Debug output for runs
    const debugRuns = {};
    for (const uid of userIds) {
      debugRuns[uid] = [];
      for (const sel of [...weeklySel, ...leagueSel].filter(s => s.user_id === uid)) {
        const map = fixtureBatting[sel.fixture_id] || {};
        const wickets = fixtureBatting[`${sel.fixture_id}_wickets`] || {};
        const sixesMap = fixtureBatting[`${sel.fixture_id}_sixes`] || {};
        for (const pid of [...(sel.team_a_ids||[]), ...(sel.team_b_ids||[])]) {
          // Try to get player name from users list (if player_id matches user_id, else leave blank)
          let playerName = '';
          // Optionally, you could build a playerId->name map if you have player data elsewhere
          // For now, leave it blank unless you have a mapping
          debugRuns[uid].push({
            fixture_id: sel.fixture_id,
            player_id: pid,
            player_name: playerName,
            runs: map[pid] || 0,
            wickets: wickets[pid] || 0,
            sixes: sixesMap[pid] || 0,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      fixturesProcessed: fixtureIds.length,
      usersProcessed: userIds.length,
      weeklyRowsInserted: weeklyRows.length,
      leagueRowsUpserted: leagueRows.length,
      dailyRowsUpserted: totalDailyRows.length,
      debugWeekly: weeklyRows,
      debugLeague: leagueRows,
      debugDaily: totalDailyRows,
      debugRuns
    });
  } catch (err) {
    console.error('Error in run-leaderboard:', err);
    return res.status(500).json({ error: err.message });
  }
}
