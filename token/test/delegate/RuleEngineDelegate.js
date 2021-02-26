'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const RuleEngineDelegateMock = artifacts.require('RuleEngineDelegateMock.sol');
const YesNoRule = artifacts.require('YesNoRule.sol');

const TOKEN_ADDRESS = '0x' + '123456789'.padStart(40, '0');

const ESTIMATE_NO_RULES = 26738;
const ESTIMATE_ONE_RULE = 32127;
const ESTIMATE_TWO_RULES = 37438;

contract('RuleEngineDelegate', function (accounts) {
  let delegate, yesRule, noRule;

  before(async function () {
    yesRule = await YesNoRule.new(true);
    noRule = await YesNoRule.new(false);
  });

  beforeEach(async function () {
    delegate = await RuleEngineDelegateMock.new();
  });

  it('should have rules valid for a transfer', async function () {
    const result = await delegate.testAreTransferRulesValid(TOKEN_ADDRESS,
      accounts[0], accounts[1], accounts[2], '1000');
    assert.ok(result, 'rules valid');
  });

  it('should let define rules', async function () {
    const tx = await delegate.defineRules(TOKEN_ADDRESS, [yesRule.address, noRule.address]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'RulesDefined', 'event');
    assert.equal(tx.logs[0].args.token, TOKEN_ADDRESS, 'token');
    assert.deepEqual(tx.logs[0].args.rules, [yesRule.address, noRule.address], 'rules');
  });

  it('should estimate no rules validation [ @skip-on-coverage ]', async function () {
    const estimate = await delegate.testAreTransferRulesValid.estimateGas(
      TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000');
    assert.equal(estimate, ESTIMATE_NO_RULES, 'no rules estimate');
  });

  it('should estimate one rules validation [ @skip-on-coverage ]', async function () {
    await delegate.defineRules(TOKEN_ADDRESS, [yesRule.address]);
    const estimate = await delegate.testAreTransferRulesValid.estimateGas(
      TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000');
    assert.equal(estimate, ESTIMATE_ONE_RULE, 'one rule estimate');
  });

  it('should estimate two rules validation [ @skip-on-coverage ]', async function () {
    await delegate.defineRules(TOKEN_ADDRESS, [yesRule.address, yesRule.address]);
    const estimate = await delegate.testAreTransferRulesValid.estimateGas(
      TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000');
    assert.equal(estimate, ESTIMATE_TWO_RULES, 'two rules estimate');
  });

  describe('With a yes rule defined', function () {
    beforeEach(async function () {
      await delegate.defineRules(TOKEN_ADDRESS, [yesRule.address]);
    });

    it('should have rules valid for a transfer', async function () {
      const result = await delegate.testAreTransferRulesValid(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(result, 'rules valid');
    });
  });

  describe('With a no rule defined', function () {
    beforeEach(async function () {
      await delegate.defineRules(TOKEN_ADDRESS, [noRule.address]);
    });

    it('should have rules invalid for a transfer', async function () {
      const result = await delegate.testAreTransferRulesValid(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'rules invalid');
    });
  });

  describe('With a yes and a no rule defined', function () {
    beforeEach(async function () {
      await delegate.defineRules(TOKEN_ADDRESS, [yesRule.address, noRule.address]);
    });

    it('should have rules invalid for a transfer', async function () {
      const result = await delegate.testAreTransferRulesValid(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'rules invalid');
    });
  });
});
