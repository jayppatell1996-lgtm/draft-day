import { requireAdmin } from '../../../lib/requireAdmin';
import { resetH2HTournament } from '../../../lib/adminLeague';
import { getLeagueSummary } from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const clearTransfers = Boolean(req.body?.clearTransfers);
    const result = await resetH2HTournament(undefined, { clearTransfers });
    const league = await getLeagueSummary();

    return res.status(200).json({
      message: clearTransfers
        ? 'Tournament reset — schedule and trade history cleared.'
        : 'Tournament reset — H2H schedule cleared (squads and trades kept).',
      ...result,
      league,
    });
  } catch (err) {
    console.error('POST /api/admin/reset-tournament:', err);
    return res.status(400).json({ error: err.message || 'Failed to reset tournament' });
  }
}
