import { requireAdmin } from '../../../lib/requireAdmin';
import { getAdminOverview } from '../../../lib/adminLeague';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const overview = await getAdminOverview();
    return res.status(200).json(overview);
  } catch (err) {
    console.error('GET /api/admin/overview:', err);
    return res.status(500).json({
      error: 'Failed to load admin overview',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
