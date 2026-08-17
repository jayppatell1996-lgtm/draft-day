import { requireAdmin } from '../../../lib/requireAdmin';
import {
  getSquadStructureAdmin,
  updateSquadStructureConfig,
} from '../../../lib/squadStructureConfig';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const slots = await getSquadStructureAdmin();
      return res.status(200).json({ slots });
    }

    if (req.method === 'PUT') {
      const { slots } = req.body ?? {};
      const updated = await updateSquadStructureConfig(slots);
      return res.status(200).json({
        message: 'Squad structure saved.',
        slots: updated,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/admin/squad-structure:', err);
    return res.status(400).json({ error: err.message || 'Failed to update squad structure' });
  }
}
