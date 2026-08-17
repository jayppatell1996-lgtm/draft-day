import { requireAdmin } from '../../../lib/requireAdmin';
import { regenerateH2HSchedule } from '../../../lib/adminLeague';
import { getLeagueSummary } from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const clearTransfers = Boolean(req.body?.clearTransfers);
    const schedule = await regenerateH2HSchedule(undefined, { clearTransfers });
    const league = await getLeagueSummary();

    return res.status(200).json({
      message: `Schedule regenerated — ${schedule.rounds} rounds, ${schedule.matchups} matchups.`,
      ...schedule,
      league,
    });
  } catch (err) {
    console.error('POST /api/admin/regenerate-schedule:', err);
    return res.status(400).json({ error: err.message || 'Failed to regenerate schedule' });
  }
}
