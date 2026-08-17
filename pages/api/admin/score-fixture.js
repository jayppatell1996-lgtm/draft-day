import { requireAdmin } from '../../../lib/requireAdmin';
import {
  ensureFixture,
  linkFixturesToRound,
  upsertFixturePlayerScores,
} from '../../../lib/h2hScoring';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const {
      roundNumber,
      externalFixtureId,
      localTeamName,
      visitorTeamName,
      startsAt,
      entries,
    } = req.body ?? {};

    if (!roundNumber || !externalFixtureId || !Array.isArray(entries)) {
      return res.status(400).json({
        error:
          'Required: roundNumber, externalFixtureId, entries[] (playerId, featuredInXi, stats)',
      });
    }

    const fixture = await ensureFixture({
      externalFixtureId: Number(externalFixtureId),
      localTeamName: localTeamName || `Team ${externalFixtureId}A`,
      visitorTeamName: visitorTeamName || `Team ${externalFixtureId}B`,
      startsAt: startsAt || new Date().toISOString(),
    });

    const scoreResult = await upsertFixturePlayerScores({
      fixtureId: fixture.id,
      entries,
    });

    const linkResult = await linkFixturesToRound({
      roundNumber: Number(roundNumber),
      fixtureIds: [fixture.id],
    });

    return res.status(200).json({
      message: `Scored fixture ${externalFixtureId} and linked to round ${roundNumber}.`,
      fixture,
      ...scoreResult,
      ...linkResult,
    });
  } catch (err) {
    console.error('POST /api/admin/score-fixture:', err);
    return res.status(400).json({ error: err.message || 'Failed to score fixture' });
  }
}
