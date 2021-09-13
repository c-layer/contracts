'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const DistributableERC20 = artifacts.require('DistributableERC20.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '10000000';
const AMOUNTS = [ '10000', '20000', '30000' ];
const APPROVAL = '60000';
const REMAINING_APPROVALS = [ '50000', '30000', '0' ];

contract('DistributableERC20', function (accounts) {
  const RECIPIENTS = [ accounts[2], accounts[3], accounts[4] ];
  let token;

  beforeEach(async function () {
    token = await DistributableERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
  });

  it('should distribute tokens from self to 1 account', async function () {
    const tx = await token.distribute(accounts[0], [ accounts[1] ], [ '10000' ]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.value, '10000', 'values');
  });

  it('should distribute tokens from self to 3 accounts', async function () {
    const tx = await token.distribute(accounts[0], RECIPIENTS, AMOUNTS);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 3);
    for (let i = 0; i < tx.logs.length; i++) {
      assert.equal(tx.logs[i].event, 'Transfer', 'event');
      assert.equal(tx.logs[i].args.from, accounts[0], 'from');
      assert.equal(tx.logs[i].args.to, RECIPIENTS[i], 'to');
      assert.equal(tx.logs[i].args.value, AMOUNTS[i], 'values');
    }
  });

  it('should not distribute with missing value parameters', async function () {
    await assertRevert(token.distribute(accounts[0], RECIPIENTS, []), 'DI01');
  });

  it('should not distribute too many tokens', async function () {
    await assertRevert(token.distribute(accounts[0],
      RECIPIENTS, [ TOTAL_SUPPLY, TOTAL_SUPPLY, TOTAL_SUPPLY ]), 'TE02');
  });

  it('should not distribute tokens from another account with missing allowance', async function () {
    await assertRevert(token.distribute(accounts[0],
      RECIPIENTS, AMOUNTS, { from: accounts[1] }), 'TE03');
  });

  describe('with allowance', function () {
    beforeEach(async function () {
      await token.approve(accounts[1], APPROVAL);
    });

    it('should not distribute tokens from another account with missing allowance', async function () {
      await assertRevert(token.distribute(accounts[0],
        [ accounts[1] ], [ TOTAL_SUPPLY ], { from: accounts[1] }), 'TE03');
    });

    it('should distribute tokens from another account', async function () {
      const tx = await token.distribute(accounts[0], RECIPIENTS, AMOUNTS, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 6);
      for (let i = 0; i < tx.logs.length; i += 2) {
        assert.equal(tx.logs[i].event, 'Approval', 'event');
        assert.equal(tx.logs[i].args.owner, accounts[0], 'owner');
        assert.equal(tx.logs[i].args.spender, accounts[1], 'spender');
        assert.equal(tx.logs[i].args.value, REMAINING_APPROVALS[i / 2], 'value');

        assert.equal(tx.logs[i + 1].event, 'Transfer', 'event');
        assert.equal(tx.logs[i + 1].args.from, accounts[0], 'from');
        assert.equal(tx.logs[i + 1].args.to, RECIPIENTS[i / 2], 'to');
        assert.equal(tx.logs[i + 1].args.value, AMOUNTS[i / 2], 'values');
      }
    });
  });
});
