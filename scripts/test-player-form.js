/**
 * Unit tests for player form badges and squad draft validation (Phase 13).
 * Usage: node scripts/test-player-form.js
 */
const assert = require('assert');

async function run() {
  const { computeFormBadge, FORM_THRESHOLDS } = await import('../lib/playerForm.js');
  const {
    validateDraftSquad,
    assignPlayerToDraftSlot,
    calculateDraftSpent,
  } = await import('../lib/squadDraft.js');

  function testInForm() {
    const badge = computeFormBadge({ matches: 5, averagePoints: 40, recentAverage: 50 });
    assert.strictEqual(badge.form, 'in_form');
  }

  function testOutOfForm() {
    const badge = computeFormBadge({ matches: 5, averagePoints: 40, recentAverage: 30 });
    assert.strictEqual(badge.form, 'out_of_form');
  }

  function testAverageForm() {
    const badge = computeFormBadge({ matches: 5, averagePoints: 40, recentAverage: 41 });
    assert.strictEqual(badge.form, 'average');
  }

  function testThresholds() {
    const avg = 100;
    const inForm = computeFormBadge({
      matches: 3,
      averagePoints: avg,
      recentAverage: avg * FORM_THRESHOLDS.inFormRatio,
    });
    assert.strictEqual(inForm.form, 'in_form');
  }

  function testDraftValidation() {
    const slots = Array.from({ length: 16 }, (_, i) => ({
      id: `s${i}`,
      player_id: i < 16 ? `p${i}` : null,
      player: i < 16 ? { price: 5 } : null,
    }));
    const ok = validateDraftSquad(slots, { salaryCap: 120, requiredCount: 16 });
    assert.strictEqual(ok.ok, true);

    const overCap = validateDraftSquad(
      [{ id: 's1', player_id: 'p1', player: { price: 130 } }],
      { salaryCap: 120, requiredCount: 1 }
    );
    assert.strictEqual(overCap.ok, false);
  }

  function testAssignDraft() {
    const slots = [
      { id: 'a', player_id: null, player: null },
      { id: 'b', player_id: 'p1', player: { id: 'p1', full_name: 'A', price: 8 } },
    ];
    const next = assignPlayerToDraftSlot(slots, 'a', {
      id: 'p1',
      fullName: 'A',
      role: 'BAT',
      price: 8,
    });
    assert.strictEqual(next[0].player_id, 'p1');
    assert.strictEqual(next[1].player_id, null);
    assert.strictEqual(calculateDraftSpent(next), 8);
  }

  testInForm();
  testOutOfForm();
  testAverageForm();
  testThresholds();
  testDraftValidation();
  testAssignDraft();

  console.log('All player form / squad draft tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
