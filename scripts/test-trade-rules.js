/**
 * Unit tests for trade rules defaults (Phase 11).
 * Usage: node scripts/test-trade-rules.js
 */
const assert = require('assert');

async function run() {
  const {
    mergeTradeRules,
    normalizeTradeRulesInput,
    DEFAULT_TRADE_RULES,
  } = await import('../lib/tradeRulesDefaults.js');

  function testMergeDefaults() {
    const rules = mergeTradeRules({});
    assert.deepStrictEqual(rules, DEFAULT_TRADE_RULES);
  }

  function testMergePartial() {
    const rules = mergeTradeRules({ freeTradesPerRound: 5 });
    assert.strictEqual(rules.freeTradesPerRound, 5);
    assert.strictEqual(rules.maxBankedFreeTrades, DEFAULT_TRADE_RULES.maxBankedFreeTrades);
  }

  function testNormalizeValid() {
    const rules = normalizeTradeRulesInput({
      freeTradesPerRound: 4,
      maxBankedFreeTrades: 12,
      playoffTradeAllowance: 6,
      playoffFreeTrades: 1,
    });
    assert.strictEqual(rules.playoffFreeTrades, 1);
  }

  function testNormalizeRejectsInvalid() {
    assert.throws(
      () => normalizeTradeRulesInput({ ...DEFAULT_TRADE_RULES, freeTradesPerRound: -1 }),
      /Invalid trade rule/
    );
    assert.throws(
      () =>
        normalizeTradeRulesInput({
          ...DEFAULT_TRADE_RULES,
          playoffFreeTrades: 10,
          playoffTradeAllowance: 8,
        }),
      /cannot exceed/
    );
  }

  testMergeDefaults();
  testMergePartial();
  testNormalizeValid();
  testNormalizeRejectsInvalid();

  console.log('All trade rules tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
