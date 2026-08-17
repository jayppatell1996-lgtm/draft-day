import { requireAdmin } from '../../../lib/requireAdmin';
import {
  configToForm,
  formToConfig,
} from '../../../lib/scoringDefaults';
import {
  getScoringConfig,
  resetScoringConfig,
  updateScoringConfig,
} from '../../../lib/scoringConfig';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const { config, isDefault } = await getScoringConfig();
      return res.status(200).json({
        config,
        form: configToForm(config),
        isDefault,
      });
    }

    if (req.method === 'PUT') {
      const { reset, form, config } = req.body ?? {};

      if (reset) {
        const result = await resetScoringConfig();
        return res.status(200).json({
          message: 'Scoring rules reset to CPL defaults.',
          config: result.config,
          form: configToForm(result.config),
          isDefault: true,
        });
      }

      const nextConfig = form ? formToConfig(form) : config;
      const result = await updateScoringConfig(nextConfig);

      return res.status(200).json({
        message: 'Scoring rules saved.',
        config: result.config,
        form: configToForm(result.config),
        isDefault: false,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/admin/scoring-config:', err);
    return res.status(400).json({ error: err.message || 'Failed to update scoring config' });
  }
}
