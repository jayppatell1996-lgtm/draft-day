/**
 * Unit tests for CPL scoring (Phase 8).
 * Usage: node scripts/test-scoring.js
 */
const assert = require('assert');
const { scorePlayer, MAN_OF_MATCH_BONUS } = require('../lib/scoring');

function testBasicBatting() {
  const pts = scorePlayer({
    runs: 52,
    ballsFaced: 30,
    fours: 4,
    sixes: 2,
  });
  // 52 runs + 4 fours + 4 six pts + 10 milestone + 20 SR (173 SR)
  assert.strictEqual(pts, 90);
}

function testBowlingHaulAndEconomy() {
  const pts = scorePlayer({
    wickets: 3,
    maidens: 1,
    overs: 4,
    runsConceded: 20,
  });
  // 75 wickets + 25 maiden + 25 3fer + 10 economy (5.0)
  assert.strictEqual(pts, 135);
}

function testFiveWicketHaul() {
  const pts = scorePlayer({
    wickets: 5,
    overs: 4,
    runsConceded: 28,
  });
  // 125 + 50 five-fer - 5 economy (7.0)
  assert.strictEqual(pts, 170);
}

function testFieldingAndMom() {
  const pts = scorePlayer({
    catches: 2,
    stumpings: 1,
    runOutsDirect: 1,
    isManOfMatch: true,
  });
  // 24 + 15 + 20 + 50 MoM
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

function run() {
  testBasicBatting();
  testBowlingHaulAndEconomy();
  testFiveWicketHaul();
  testFieldingAndMom();
  testSuperOverExcluded();
  testStrikeRateRequiresTwentyRuns();
  console.log('scoring tests passed');
}

run();
