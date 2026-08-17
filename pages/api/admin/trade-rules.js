import { requireAdmin } from '../../../lib/requireAdmin';
import { rulesToForm } from '../../../lib/tradeRulesDefaults';
import {
  getTradeRulesConfig,
  resetTradeRulesConfig,
  updateTradeRulesConfig,
} from '../../../lib/tradeRulesConfig';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const { rules, isDefault } = await getTradeRulesConfig();
      return res.status(200).json({
        rules,
        form: rulesToForm(rules),
        isDefault,
      });
    }

    if (req.method === 'PUT') {
      const { reset, form } = req.body ?? {};

      if (reset) {
        const result = await resetTradeRulesConfig();
        return res.status(200).json({
          message: 'Trade rules reset to defaults.',
          rules: result.rules,
          form: rulesToForm(result.rules),
          isDefault: true,
        });
      }

      const result = await updateTradeRulesConfig(form);
      return res.status(200).json({
        message: 'Trade rules saved.',
        rules: result.rules,
        form: rulesToForm(result.rules),
        isDefault: false,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/admin/trade-rules:', err);
    return res.status(400).json({ error: err.message || 'Failed to update trade rules' });
  }
}
