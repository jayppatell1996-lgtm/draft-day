import { requireAdmin } from '../../../lib/requireAdmin';
import {
  createPlayoffBracket,
  getPlayoffBracket,
  getPlayoffStatus,
} from '../../../lib/playoffLeague';
import { getLeagueSummary } from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const result = await createPlayoffBracket();
    const [status, bracket, league] = await Promise.all([
      getPlayoffStatus(),
      getPlayoffBracket(),
      getLeagueSummary(),
    ]);

    return res.status(200).json({
      message: 'Playoff bracket created — Qualifier 1 and Eliminator are live.',
      ...result,
      status,
      bracket,
      league,
    });
  } catch (err) {
    console.error('POST /api/league/init-playoffs:', err);
    return res.status(400).json({ error: err.message || 'Failed to create playoffs' });
  }
}
