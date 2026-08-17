import { requireAdmin } from '../../../lib/requireAdmin';
import {
  bulkAdjustPlayerPrices,
  listAdminPlayers,
  setPlayerActive,
  updatePlayerPrice,
} from '../../../lib/adminPlayers';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const { search, includeInactive } = req.query ?? {};
      const players = await listAdminPlayers({
        search: search ? String(search) : undefined,
        includeInactive: includeInactive !== 'false',
      });
      return res.status(200).json({ players });
    }

    if (req.method === 'PUT') {
      const { playerId, price, active, bulkAdjust } = req.body ?? {};

      if (bulkAdjust) {
        const result = await bulkAdjustPlayerPrices(bulkAdjust);
        return res.status(200).json({
          message: `Updated prices for ${result.updated} of ${result.total} players.`,
          ...result,
        });
      }

      if (playerId && active !== undefined) {
        const result = await setPlayerActive(playerId, active);
        return res.status(200).json({
          message: result.active ? 'Player activated.' : 'Player deactivated.',
          ...result,
        });
      }

      if (playerId && price != null) {
        const result = await updatePlayerPrice(playerId, price);
        return res.status(200).json({
          message: 'Player price updated.',
          ...result,
        });
      }

      return res.status(400).json({ error: 'Missing playerId and price or active flag' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/admin/players:', err);
    return res.status(400).json({ error: err.message || 'Failed to update players' });
  }
}
