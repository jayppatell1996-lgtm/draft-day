/**
 * Unit tests for CPL scoring (Phase 8).
 * Usage: node scripts/test-scoring.js
 */
const assert = require('assert');

async function run() {
  const { scorePlayer, MAN_OF_MATCH_BONUS } = await import('../lib/scoring.js');

  function testBasicBatting() {
    const pts = scorePlayer({
      runs: 52,
      ballsFaced: 30,
      fours: 4,
      sixes: 2,
    });
    assert.strictEqual(pts, 90);
  }

  function testBowlingHaulAndEconomy() {
    const pts = scorePlayer({
      wickets: 3,
      maidens: 1,
      overs: 4,
      runsConceded: 20,
    });
    assert.strictEqual(pts, 135);
  }

  function testFiveWicketHaul() {
    const pts = scorePlayer({
      wickets: 5,
      overs: 4,
      runsConceded: 28,
    });
    assert.strictEqual(pts, 170);
  }

  function testFieldingAndMom() {
    const pts = scorePlayer({
      catches: 2,
      stumpings: 1,
      runOutsDirect: 1,
      isManOfMatch: true,
    });
    assert.strictEqual(pts, 24 + 15 + 20 + MAN_OF_MATCH_BONUS);
  }

  function testSuperOverExcluded() {
    assert.strictEqual(scorePlayer({ runs: 30, excludeSuperOver: true }), 0);
  }

  function testStrikeRateRequiresTwentyRuns() {
    const low = scorePlayer({ runs: 19, ballsFaced: 10, fours: 0, sixes: 0 });
    const high = scorePlayer({ runs: 20, ballsFaced: 10, fours: 0, sixes: 0 });
    assert.ok(high > low);
  }

  function testCustomConfig() {
    const pts = scorePlayer(
      { runs: 10, ballsFaced: 10, fours: 0, sixes: 0 },
      { batting: { pointsPerRun: 2, pointsPerFour: 0, pointsPerSix: 0, srMinRuns: 99, milestones: [], strikeRateBonus: [] }, bowling: { pointsPerWicket: 0, pointsPerMaiden: 0, threeWicketBonus: 0, fiveWicketBonus: 0, economyBonus: [] }, fielding: { catch: 0, stumping: 0, runOutDirect: 0, runOutIndirect: 0 }, manOfMatchBonus: 0, captainMultiplier: 2 }
    );
    assert.strictEqual(pts, 20);
  }

  testBasicBatting();
  testBowlingHaulAndEconomy();
  testFiveWicketHaul();
  testFieldingAndMom();
  testSuperOverExcluded();
  testStrikeRateRequiresTwentyRuns();
  testCustomConfig();
  console.log('scoring tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
