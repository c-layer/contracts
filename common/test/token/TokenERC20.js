'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const TokenERC20 = artifacts.require('TokenERC20.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '10000000';
const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('TokenERC20', function (accounts) {
  let token;

  beforeEach(async function () {
    token = await TokenERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
  });

  it('should have a name', async function () {
    const name = await token.name();
    assert.equal(name, NAME, 'name');
  });

  it('should have a symbol', async function () {
    const symbol = await token.symbol();
    assert.equal(symbol, SYMBOL, 'symbol');
  });

  it('should have decimals', async function () {
    const decimals = await token.decimals();
    assert.equal(decimals, DECIMALS, 'decimals');
  });

  it('should have a total supply', async function () {
    const totalSupply = await token.totalSupply();
    assert.equal(totalSupply, TOTAL_SUPPLY, 'total supply');
  });

  it('should have token balance for initial account', async function () {
    const balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0, TOTAL_SUPPLY, 'balance account 0');
  });

  it('should have no tokens balance for other accounts', async function () {
    const balance0 = await token.balanceOf(accounts[1]);
    assert.equal(balance0, 0, 'balance account 1');
  });

  it('should have 0 allowance for account 1 on account 0', async function () {
    const allowance0 = await token.allowance(accounts[0], accounts[1]);
    assert.equal(allowance0, 0, 'allowance 0');
  });

  it('should let account 0 transfer some tokens to account 1', async function () {
    const tx = await token.transfer(accounts[1], '1000');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
  });

  it('should let account 0 approve tokens to account 1', async function () {
    const tx = await token.approve(accounts[1], '1000');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Approval', 'event');
    assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
    assert.equal(tx.logs[0].args.spender, accounts[1], 'spender');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
  });

  it('should let account 0 increase approval to account 1', async function () {
    const tx = await token.increaseApproval(accounts[1], '1000');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Approval', 'event');
    assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
    assert.equal(tx.logs[0].args.spender, accounts[1], 'spender');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
  });

  it('should let account 0 decrease approval to account 1', async function () {
    const tx = await token.decreaseApproval(accounts[1], '1000');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Approval', 'event');
    assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
    assert.equal(tx.logs[0].args.spender, accounts[1], 'spender');
    assert.equal(tx.logs[0].args.value, '0', 'value');
  });

  it('should prevent account 0 to transfer token to address 0', async function () {
    await assertRevert(token.transfer(NULL_ADDRESS, '1000'), 'TE01');
  });

  it('should prevent account 1 to transfer token to account 0', async function () {
    await assertRevert(token.transfer(accounts[0], '1000', { from: accounts[1] }), 'TE02');
  });

  it('should prevent account 1 to transfer token from account 0', async function () {
    await assertRevert(token.transferFrom(
      accounts[0], accounts[1], '1000', { from: accounts[1] }), 'TE03');
  });

  describe('with account 0 approval to account 1', function () {
    beforeEach(async function () {
      await token.approve(accounts[1], '1000');
    });

    it('should let account1 transfer token from account 0', async function () {
      const tx = await token.transferFrom(
        accounts[0], accounts[1], '1000', { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, 'Approval', 'event');
      assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
      assert.equal(tx.logs[0].args.spender, accounts[1], 'spender');
      assert.equal(tx.logs[0].args.value, '0', 'value');
      assert.equal(tx.logs[1].event, 'Transfer', 'event');
      assert.equal(tx.logs[1].args.from, accounts[0], 'from');
      assert.equal(tx.logs[1].args.to, accounts[1], 'to');
      assert.equal(tx.logs[1].args.value, '1000', 'value');
    });

    it('should prevent account 1 to transfer too many token from account 0', async function () {
      await assertRevert(token.transferFrom(
        accounts[0], accounts[1], '1100', { from: accounts[1] }), 'TE03');
    });

    it('should let account 0 decrease approval to account 1', async function () {
      const tx = await token.decreaseApproval(accounts[1], '500');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Approval', 'event');
      assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
      assert.equal(tx.logs[0].args.spender, accounts[1], 'spender');
      assert.equal(tx.logs[0].args.value, '500', 'value');
    });
  });
});
