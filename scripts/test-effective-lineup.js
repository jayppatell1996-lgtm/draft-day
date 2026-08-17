/**
 * Unit tests for effective lineup / auto-sub (Phase 7).
 * Usage: node scripts/test-effective-lineup.js
 */
const assert = require('assert');
const {
  computeEffectiveLineup,
  splitSquadSlots,
  CAPTAIN_MULTIPLIER,
} = require('../lib/effectiveLineup');

function slot(type, index, playerId, isPlaying = true) {
  return {
    slot_type: type,
    slot_index: index,
    player_id: playerId,
    is_playing: isPlaying,
  };
}

function testPlayingStarterScoresWithoutSub() {
  const playing = [slot('BAT', 0, 'p1')];
  const bench = [slot('BENCH', 0, 'p2', false)];
  const result = computeEffectiveLineup({
    playingSlots: playing,
    benchSlots: bench,
    captainPlayerId: 'p1',
    viceCaptainPlayerId: 'p2',
    featuredPlayerIds: new Set(['p1']),
    playerPoints: { p1: 40, p2: 100 },
  });

  assert.strictEqual(result.totalPoints, 80, 'captain 2x on playing starter');
  assert.strictEqual(result.changes.length, 0);
}

function testAutoSubPicksHighestScoringBench() {
  const playing = [slot('BAT', 0, 'p1'), slot('BAT', 1, 'p3')];
  const bench = [
    slot('BENCH', 0, 'p2', false),
    slot('BENCH', 1, 'p4', false),
  ];

  const result = computeEffectiveLineup({
    playingSlots: playing,
    benchSlots: bench,
    captainPlayerId: 'p1',
    featuredPlayerIds: new Set(['p3', 'p2', 'p4']),
    playerPoints: { p1: 0, p2: 30, p3: 10, p4: 50 },
  });

  assert.strictEqual(result.starters[0].effectivePlayerId, 'p4');
  assert.strictEqual(result.starters[0].basePoints, 50);
  assert.strictEqual(result.starters[1].effectivePlayerId, 'p3');
  assert.strictEqual(result.changes[0].type, 'sub');
  assert.strictEqual(result.changes[0].inPlayerId, 'p4');
}

function testCaptainCascadeToVice() {
  const playing = [slot('BAT', 0, 'c'), slot('BAT', 1, 'vc')];
  const bench = [slot('BENCH', 0, 'b', false)];

  const result = computeEffectiveLineup({
    playingSlots: playing,
    benchSlots: bench,
    captainPlayerId: 'c',
    viceCaptainPlayerId: 'vc',
    featuredPlayerIds: new Set(['vc', 'b']),
    playerPoints: { c: 0, vc: 25, b: 100 },
  });

  assert.strictEqual(result.captainMultiplierPlayerId, 'vc');
  assert.strictEqual(result.totalPoints, 150);
  assert.strictEqual(result.starters[0].effectivePlayerId, 'b');
}

function testBenchPlayerUsedOnce() {
  const playing = [
    slot('BAT', 0, 'out1'),
    slot('BAT', 1, 'out2'),
  ];
  const bench = [slot('BENCH', 0, 'sub1', false)];

  const result = computeEffectiveLineup({
    playingSlots: playing,
    benchSlots: bench,
    featuredPlayerIds: new Set(['sub1']),
    playerPoints: { out1: 0, out2: 0, sub1: 20 },
  });

  const subsUsed = result.starters.filter((s) => s.effectivePlayerId === 'sub1');
  assert.strictEqual(subsUsed.length, 1);
  assert.strictEqual(result.changes.filter((c) => c.type === 'no_bench').length, 1);
}

function testSplitSquadSlots() {
  const slots = [
    slot('BAT', 0, 'p1'),
    slot('BENCH', 0, 'p2', false),
  ];
  const { playingSlots, benchSlots } = splitSquadSlots(slots);
  assert.strictEqual(playingSlots.length, 1);
  assert.strictEqual(benchSlots.length, 1);
}

function run() {
  testPlayingStarterScoresWithoutSub();
  testAutoSubPicksHighestScoringBench();
  testCaptainCascadeToVice();
  testBenchPlayerUsedOnce();
  testSplitSquadSlots();
  console.log('effectiveLineup tests passed');
}

run();
