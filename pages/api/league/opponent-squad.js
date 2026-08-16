import { getServerAuthSession } from '../../../lib/getServerAuthSession';
import { getSquadWithSlots } from '../../../lib/squads';
import { getPool } from '../../../lib/db';
import { DEFAULT_LEAGUE_ID } from '../../../lib/constants';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { matchupId } = req.query;
    if (!matchupId) {
      return res.status(400).json({ error: 'matchupId required' });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT m.id, m.status, m.home_team_id, m.away_team_id,
              ht.name AS home_name, at.name AS away_name
       FROM h2h_matchups m
       JOIN fantasy_teams ht ON ht.id = m.home_team_id
       JOIN fantasy_teams at ON at.id = m.away_team_id
       WHERE m.id = $1 AND m.league_id = $2`,
      [matchupId, DEFAULT_LEAGUE_ID]
    );

    const matchup = rows[0];
    if (!matchup) {
      return res.status(404).json({ error: 'Matchup not found' });
    }

    const viewerTeamId = session.user.teamId;
    let opponentTeamId = null;
    let opponentName = null;

    if (matchup.home_team_id === viewerTeamId) {
      opponentTeamId = matchup.away_team_id;
      opponentName = matchup.away_name;
    } else if (matchup.away_team_id === viewerTeamId) {
      opponentTeamId = matchup.home_team_id;
      opponentName = matchup.home_name;
    } else {
      return res.status(403).json({ error: 'You are not in this matchup' });
    }

    const hidden = matchup.status === 'scheduled';

    if (hidden) {
      return res.status(200).json({
        hidden: true,
        opponent: { teamId: opponentTeamId, teamName: opponentName },
        message: 'Opponent squad hidden until the match starts',
      });
    }

    const squadData = await getSquadWithSlots(opponentTeamId);
    return res.status(200).json({
      hidden: false,
      opponent: {
        teamId: opponentTeamId,
        teamName: opponentName,
        squad: squadData.squad,
        slots: squadData.slots.map((slot) => ({
          slot_type: slot.slot_type,
          slot_index: slot.slot_index,
          is_playing: slot.is_playing,
          player: slot.player
            ? {
                full_name: slot.player.full_name,
                role: slot.player.role,
                franchise_name: slot.player.franchise_name,
              }
            : null,
        })),
      },
    });
  } catch (err) {
    console.error('GET /api/league/opponent-squad:', err);
    return res.status(500).json({
      error: 'Failed to load opponent squad',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
