import { requireAdmin } from '../../../lib/requireAdmin';
import {
  deleteLockTime,
  listAdminFixtures,
  listAdminLockTimes,
  upsertLockTime,
} from '../../../lib/adminLocks';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const [lockTimes, fixtures] = await Promise.all([
        listAdminLockTimes(),
        listAdminFixtures(),
      ]);
      return res.status(200).json({ lockTimes, fixtures });
    }

    if (req.method === 'PUT') {
      const result = await upsertLockTime(req.body ?? {});
      return res.status(200).json({
        message: result.created ? 'Lock time created.' : 'Lock time updated.',
        ...result,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'Lock time id is required' });
      await deleteLockTime(id);
      return res.status(200).json({ message: 'Lock time deleted.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/admin/lock-times:', err);
    return res.status(400).json({ error: err.message || 'Failed to update lock times' });
  }
}
