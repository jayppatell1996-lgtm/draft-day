import { getServerAuthSession } from '../../../lib/getServerAuthSession';
import { createH2HSchedule, getLeagueSummary } from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!session.user.isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }

    const result = await createH2HSchedule();
    const league = await getLeagueSummary();

    return res.status(200).json({ ...result, league });
  } catch (err) {
    console.error('POST /api/league/init-schedule:', err);
    return res.status(400).json({ error: err.message || 'Failed to create schedule' });
  }
}
