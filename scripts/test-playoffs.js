/**
 * Unit tests for IPL playoff bracket logic (Phase 10).
 * Usage: node scripts/test-playoffs.js
 */
const assert = require('assert');

async function run() {
  const {
    seedTeamsFromStandings,
    getInitialPlayoffPairings,
    buildQualifier2Pairing,
    buildFinalPairing,
    winnerTeamId,
    loserTeamId,
    isMatchupDecided,
    regularSeasonComplete,
    MIN_PLAYOFF_TEAMS,
  } = await import('../lib/playoffs.js');

  const standings = [
    { teamId: 't1', teamName: 'Alpha' },
    { teamId: 't2', teamName: 'Bravo' },
    { teamId: 't3', teamName: 'Charlie' },
    { teamId: 't4', teamName: 'Delta' },
    { teamId: 't5', teamName: 'Echo' },
    { teamId: 't6', teamName: 'Foxtrot' },
    { teamId: 't7', teamName: 'Golf' },
  ];

  function testSeeding() {
    const seeds = seedTeamsFromStandings(standings);
    assert.strictEqual(seeds.length, MIN_PLAYOFF_TEAMS);
    assert.strictEqual(seeds[0].seed, 1);
    assert.strictEqual(seeds[0].teamId, 't1');
    assert.strictEqual(seeds[5].teamName, 'Foxtrot');
  }

  function testInitialPairings() {
    const seeds = seedTeamsFromStandings(standings);
    const pairings = getInitialPlayoffPairings(seeds);
    assert.strictEqual(pairings.qualifier1.homeTeamId, 't1');
    assert.strictEqual(pairings.qualifier1.awayTeamId, 't2');
    assert.strictEqual(pairings.eliminator.homeTeamId, 't3');
    assert.strictEqual(pairings.eliminator.awayTeamId, 't4');
  }

  function testQ2AndFinal() {
    const q1 = {
      homeTeamId: 't1',
      awayTeamId: 't2',
      result: 'home_win',
    };
    const elim = {
      homeTeamId: 't3',
      awayTeamId: 't4',
      result: 'away_win',
    };
    const q2Pair = buildQualifier2Pairing(q1, elim);
    assert.deepStrictEqual(q2Pair, { homeTeamId: 't2', awayTeamId: 't4' });

    const q2 = { ...q2Pair, result: 'home_win' };
    const finalPair = buildFinalPairing(q1, q2);
    assert.deepStrictEqual(finalPair, { homeTeamId: 't1', awayTeamId: 't2' });
  }

  function testWinnerLoser() {
    const m = { homeTeamId: 'a', awayTeamId: 'b', result: 'away_win' };
    assert.strictEqual(winnerTeamId(m), 'b');
    assert.strictEqual(loserTeamId(m), 'a');
    assert.strictEqual(isMatchupDecided(m), true);
    assert.strictEqual(isMatchupDecided({ result: 'draw' }), false);
  }

  function testRegularSeasonComplete() {
    assert.strictEqual(regularSeasonComplete({ totalMatchups: 10, completedMatchups: 9 }), false);
    assert.strictEqual(regularSeasonComplete({ totalMatchups: 10, completedMatchups: 10 }), true);
    assert.strictEqual(regularSeasonComplete({ totalMatchups: 0, completedMatchups: 0 }), false);
  }

  function testMinTeamsGuard() {
    assert.throws(
      () => seedTeamsFromStandings(standings.slice(0, 5)),
      /Need at least 6 teams/
    );
  }

  testSeeding();
  testInitialPairings();
  testQ2AndFinal();
  testWinnerLoser();
  testRegularSeasonComplete();
  testMinTeamsGuard();

  console.log('All playoff tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
