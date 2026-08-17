import { requireAdmin } from '../../../lib/requireAdmin';
import { recalculateRoundScores } from '../../../lib/h2hScoring';
import { getStandings } from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const roundNumber = Number(req.body?.roundNumber);
    if (!roundNumber || roundNumber < 1) {
      return res.status(400).json({ error: 'roundNumber is required' });
    }

    const result = await recalculateRoundScores(roundNumber);
    const standings = await getStandings();

    return res.status(200).json({
      message: `Round ${roundNumber} recalculated — ${result.matchupsUpdated} matchups updated.`,
      ...result,
      standings,
    });
  } catch (err) {
    console.error('POST /api/admin/recalculate-round:', err);
    return res.status(400).json({ error: err.message || 'Failed to recalculate round' });
  }
}
