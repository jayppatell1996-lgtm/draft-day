import { requireAdmin } from '../../../lib/requireAdmin';
import { getLeagueAudit } from '../../../lib/adminLeague';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const audit = await getLeagueAudit();
    return res.status(200).json(audit);
  } catch (err) {
    console.error('/api/admin/audit:', err);
    return res.status(500).json({ error: err.message || 'Failed to load audit data' });
  }
}
