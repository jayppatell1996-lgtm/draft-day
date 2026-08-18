import { requireAdmin } from '../../../lib/requireAdmin';
import { getAdminBootstrap } from '../../../lib/adminBootstrap';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const bootstrap = await getAdminBootstrap();
    return res.status(200).json(bootstrap);
  } catch (err) {
    console.error('GET /api/admin/bootstrap:', err);
    return res.status(500).json({
      error: 'Failed to load admin data',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
