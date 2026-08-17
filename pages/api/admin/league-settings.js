import { requireAdmin } from '../../../lib/requireAdmin';
import { getLeagueSettings, updateLeagueSettings } from '../../../lib/leagueSettings';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const settings = await getLeagueSettings();
      return res.status(200).json({ settings });
    }

    if (req.method === 'PUT') {
      const settings = await updateLeagueSettings(req.body ?? {});
      return res.status(200).json({
        message: 'League settings saved.',
        settings,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/admin/league-settings:', err);
    return res.status(400).json({ error: err.message || 'Failed to update league settings' });
  }
}
